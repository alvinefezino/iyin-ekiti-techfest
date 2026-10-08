"use client";
import { useEffect, useState } from "react";
import { EXAM_QUESTIONS } from "@/lib/examQuestions";
export default function ExamPeek(){
  const [qs,setQs]=useState<typeof EXAM_QUESTIONS>([]);
  useEffect(()=>{ setQs(EXAM_QUESTIONS); },[]);
  return <div className="min-h-screen bg-[#013216] text-white p-6">
    <h1 className="text-xl font-semibold">Exam preview — 50 placeholder questions (no token needed)</h1>
    <p className="text-sm text-white/60 mt-1">This is the same file the Exam Terminal uses when the DB has no questions. Open an invite <code className="text-[#F57F17]">/exam/&lt;token&gt;?preview=1</code> for the shuffled terminal.</p>
    <ol className="mt-6 grid gap-3 list-decimal pl-6">{qs.map(q=> <li key={q.id} className="bg-black border border-white/10 rounded-xl p-3"><div className="font-medium">{q.question}</div><div className="text-sm text-white/60 mt-1">{q.options.map((o,i)=> <span key={i} className={q.answer===i?"text-[#F57F17] font-semibold":""}>{String.fromCharCode(65+i)}. {o} </span>)}</div></li>)}</ol>
  </div>;
}
