export async function POST() {
  return Response.json(
    { error: "This endpoint was removed. Use POST /api/upload with multipart form-data." },
    { status: 410 }
  );
}
