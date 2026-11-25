import { randomUUID } from "node:crypto";
import { createServerSupabaseClients, getRequestUser, isUuid, jsonError } from "@/lib/server/api-auth";
import { generateProductionFiles } from "@/lib/server/production-files";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }
  if (!isUuid(body?.orderId)) return jsonError("A valid order ID is required.", 400);

  let clients;
  try {
    clients = createServerSupabaseClients();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Server configuration is incomplete.", 503);
  }

  const { user, error: authError } = await getRequestUser(request, clients.authClient);
  if (authError) return jsonError(authError, 401);

  const { data: profile, error: profileError } = await clients.adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return jsonError(`Could not verify staff role: ${profileError.message}`, 500);
  if (profile?.role !== "admin") return jsonError("Administrator access required.", 403);

  const { data: order, error: orderError } = await clients.adminClient
    .from("orders")
    .select("id,order_number,design_id,product_id,configuration,quantity,total,status,payment_status")
    .eq("id", body.orderId)
    .maybeSingle();
  if (orderError) return jsonError(`Could not load the order: ${orderError.message}`, 500);
  if (!order) return jsonError("Order not found.", 404);
  if (!["paid", "mock_paid"].includes(order.payment_status)) {
    return jsonError("Payment must be confirmed before production files can be generated.", 409);
  }
  if (!["production", "completed"].includes(order.status)) {
    return jsonError("Move the order to production after proof approval before generating files.", 409);
  }

  const [{ data: design, error: designError }, { data: product, error: productError }, { data: proof, error: proofError }] = await Promise.all([
    clients.adminClient.from("designs")    .select("name,content,artwork_url").eq("id", order.design_id).maybeSingle(),
    clients.adminClient.from("products").select("name").eq("id", order.product_id).maybeSingle(),
    clients.adminClient.from("proofs").select("status,version").eq("order_id", order.id).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (designError) return jsonError(`Could not load the saved design: ${designError.message}`, 500);
  if (productError) return jsonError(`Could not load the product: ${productError.message}`, 500);
  if (proofError) return jsonError(`Could not load proof approval: ${proofError.message}`, 500);
  if (!design || !product) return jsonError("The order is missing its saved design or product.", 422);
  if (proof?.status !== "approved") return jsonError("The latest proof must be approved before generating files.", 409);

  let artworkBuffer;
  if (design.artwork_url && /\.(png|jpe?g|svg)$/i.test(design.artwork_url)) {
    const { data: artwork, error: artworkError } = await clients.adminClient.storage
      .from("artwork")
      .download(design.artwork_url);
    if (artworkError) return jsonError(`Could not load the uploaded artwork: ${artworkError.message}`, 500);
    artworkBuffer = Buffer.from(await artwork.arrayBuffer());
  }

  let files;
  try {
    files = await generateProductionFiles(order, design, product, artworkBuffer);
  } catch (generationError) {
    return jsonError(generationError instanceof Error ? generationError.message : "Could not generate production files.", 422);
  }

  const uploadedPaths = [];
  const fileRecords = [];
  const fileLinks = [];
  try {
    for (const file of files) {
      const path = `orders/${order.id}/production/${randomUUID()}-${file.fileName}`;
      const { error: uploadError } = await clients.adminClient.storage.from("artwork").upload(path, file.buffer, {
        contentType: file.contentType,
        upsert: false,
      });
      if (uploadError) throw new Error(`Could not store ${file.type.toUpperCase()}: ${uploadError.message}`);
      uploadedPaths.push(path);
      fileRecords.push({ order_id: order.id, type: file.type, file_url: path });

      const { data: signedFile, error: signedError } = await clients.adminClient.storage
        .from("artwork")
        .createSignedUrl(path, 300, { download: file.fileName });
      if (signedError) throw new Error(`Could not prepare the ${file.type.toUpperCase()} download: ${signedError.message}`);
      fileLinks.push({ type: file.type, fileName: file.fileName, url: signedFile.signedUrl });
    }

    if (design.artwork_url) {
      const { data: originalArtwork, error: artworkError } = await clients.adminClient.storage
        .from("artwork")
        .createSignedUrl(design.artwork_url, 300, { download: true });
      if (artworkError) throw new Error(`Could not prepare the original artwork download: ${artworkError.message}`);
      fileLinks.push({
        type: "artwork",
        fileName: design.artwork_url.split("/").pop(),
        url: originalArtwork.signedUrl,
      });
    }

    const { error: recordsError } = await clients.adminClient.from("order_files").insert(fileRecords);
    if (recordsError) throw new Error(`Could not save generated file records: ${recordsError.message}`);
  } catch (fileError) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await clients.adminClient.storage.from("artwork").remove(uploadedPaths);
      if (cleanupError) console.error("Production file cleanup failed:", cleanupError.message);
    }
    return jsonError(fileError instanceof Error ? fileError.message : "Could not store production files.", 500);
  }

  return Response.json({ files: fileLinks });
}
