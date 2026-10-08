import ExamTerminal from "@/components/exam/ExamTerminal";
export default async function Page({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const preview = sp?.preview === "1";
  return <ExamTerminal token={token} preview={preview} />;
}
