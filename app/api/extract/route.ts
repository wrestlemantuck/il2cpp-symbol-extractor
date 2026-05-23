import { NextRequest, NextResponse } from 'next/server';
import { parseELF } from '@/lib/elf-parser';
import { parseIL2CPPMetadata } from '@/lib/il2cpp-metadata';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const soFile = formData.get('libil2cpp') as File | null;
    const metaFile = formData.get('metadata') as File | null;

    if (!soFile) {
      return NextResponse.json({ error: 'Missing libil2cpp.so' }, { status: 400 });
    }

    const soBytes = Buffer.from(await soFile.arrayBuffer());
    const elf = parseELF(soBytes);

    if (!elf.valid) {
      return NextResponse.json({ error: elf.error }, { status: 400 });
    }

    let metadata;
    if (metaFile) {
      const metaBytes = Buffer.from(await metaFile.arrayBuffer());
      metadata = parseIL2CPPMetadata(metaBytes);
    }

    return NextResponse.json({
      success: true,
      elf,
      metadata,
      note: metadata?.valid ? 'Metadata parsed.' : 'No metadata provided.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
