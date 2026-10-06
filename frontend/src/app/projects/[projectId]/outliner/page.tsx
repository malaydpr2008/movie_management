"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OutlinerRedirect({ params }: { params: { projectId: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/projects/${params.projectId}`);
  }, [params.projectId, router]);

  return (
    <div className="h-full flex items-center justify-center p-12 text-slate-500 font-mono text-xs">
      Redirecting to Project Overview...
    </div>
  );
}
