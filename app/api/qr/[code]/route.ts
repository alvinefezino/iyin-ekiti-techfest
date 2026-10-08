import QRCode from "qrcode";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^[A-Z0-9]{6,32}$/.test(code)) return new Response("Bad code", { status: 400 });
  const png = await QRCode.toBuffer(`TF:${code}`, { width: 360, margin: 1 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" } });
}
