export interface SymbolEntry {
  name: string;
  value: string;
  size: number;
  type: string;
  bind: string;
  visibility: string;
  shndx: number;
  sectionName?: string;
}

export interface SectionInfo {
  name: string;
  type: string;
  address: string;
  size: number;
  flags: string;
  offset: number;
}

export interface ParsedELFResult {
  valid: boolean;
  error?: string;
  architecture: string;
  class: string;
  endian: string;
  osabi: string;
  type: string;
  entryPoint: string;
  sections: SectionInfo[];
  dynamicSymbols: SymbolEntry[];
  staticSymbols: SymbolEntry[];
  il2cppExports: Array<{ name: string; address: string }>;
  strings: string[];
  il2cppStrings: string[];
  warnings: string[];
}

const ELFMAG = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

const EI_CLASS = 4;
const EI_DATA = 5;
const EI_OSABI = 7;

const ELFCLASS32 = 1;
const ELFCLASS64 = 2;
const ELFDATA2LSB = 1;
const ELFDATA2MSB = 2;

const SHT_NULL = 0;
const SHT_PROGBITS = 1;
const SHT_SYMTAB = 2;
const SHT_STRTAB = 3;
const SHT_NOBITS = 8;
const SHT_DYNSYM = 11;

const EM_386 = 3;
const EM_ARM = 40;
const EM_X86_64 = 62;
const EM_AARCH64 = 183;

function getMachineName(machine: number): string {
  switch (machine) {
    case EM_386: return 'x86';
    case EM_ARM: return 'ARM';
    case EM_X86_64: return 'x86-64';
    case EM_AARCH64: return 'ARM64';
    default: return `Unknown(${machine})`;
  }
}

function getTypeName(type: number): string {
  switch (type) {
    case 0: return 'ET_NONE';
    case 1: return 'ET_REL';
    case 2: return 'ET_EXEC';
    case 3: return 'ET_DYN';
    case 4: return 'ET_CORE';
    default: return `Unknown(${type})`;
  }
}

function getOSABIName(osabi: number): string {
  switch (osabi) {
    case 0: return 'System V';
    case 3: return 'Linux';
    default: return `Unknown(${osabi})`;
  }
}

function getSectionTypeName(type: number): string {
  switch (type) {
    case SHT_NULL: return 'NULL';
    case SHT_PROGBITS: return 'PROGBITS';
    case SHT_SYMTAB: return 'SYMTAB';
    case SHT_STRTAB: return 'STRTAB';
    case SHT_NOBITS: return 'NOBITS';
    case SHT_DYNSYM: return 'DYNSYM';
    default: return `Unknown(${type})`;
  }
}

function getSymbolTypeName(type: number): string {
  switch (type) {
    case 0: return 'NOTYPE';
    case 1: return 'OBJECT';
    case 2: return 'FUNC';
    case 3: return 'SECTION';
    case 4: return 'FILE';
    default: return `Unknown(${type})`;
  }
}

function getSymbolBindName(bind: number): string {
  switch (bind) {
    case 0: return 'LOCAL';
    case 1: return 'GLOBAL';
    case 2: return 'WEAK';
    default: return `Unknown(${bind})`;
  }
}

function getSymbolVisibility(other: number): string {
  const vis = other & 0x3;
  switch (vis) {
    case 0: return 'DEFAULT';
    case 1: return 'INTERNAL';
    case 2: return 'HIDDEN';
    case 3: return 'PROTECTED';
    default: return `Unknown(${vis})`;
  }
}

function readUInt16(buf: Buffer, off: number, le: boolean): number {
  return le ? buf.readUInt16LE(off) : buf.readUInt16BE(off);
}

function readUInt32(buf: Buffer, off: number, le: boolean): number {
  return le ? buf.readUInt32LE(off) : buf.readUInt32BE(off);
}

function readUInt64(buf: Buffer, off: number, le: boolean): bigint {
  return le ? buf.readBigUInt64LE(off) : buf.readBigUInt64BE(off);
}

function readAddr(buf: Buffer, off: number, is64: boolean, le: boolean): bigint {
  return is64 ? readUInt64(buf, off, le) : BigInt(readUInt32(buf, off, le));
}

function readOff(buf: Buffer, off: number, is64: boolean, le: boolean): bigint {
  return is64 ? readUInt64(buf, off, le) : BigInt(readUInt32(buf, off, le));
}

function readXWord(buf: Buffer, off: number, is64: boolean, le: boolean): bigint {
  return is64 ? readUInt64(buf, off, le) : BigInt(readUInt32(buf, off, le));
}

function readString(buf: Buffer, offset: number): string {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end++;
  return buf.toString('utf8', offset, end);
}

interface RawSection {
  nameIdx: number;
  type: number;
  flags: bigint;
  addr: bigint;
  offset: bigint;
  size: bigint;
  link: number;
  info: number;
  addralign: bigint;
  entsize: bigint;
}

interface RawSymbol {
  nameIdx: number;
  value: bigint;
  size: bigint;
  info: number;
  other: number;
  shndx: number;
}

export function parseELF(buffer: Buffer): ParsedELFResult {
  const warnings: string[] = [];

  if (buffer.length < 16 || !buffer.slice(0, 4).equals(ELFMAG)) {
    return { valid: false, error: 'Not a valid ELF file', architecture: '', class: '', endian: '', osabi: '', type: '', entryPoint: '', sections: [], dynamicSymbols: [], staticSymbols: [], il2cppExports: [], strings: [], il2cppStrings: [], warnings: [] };
  }

  const elfClass = buffer[EI_CLASS];
  const elfData = buffer[EI_DATA];
  const osabi = buffer[EI_OSABI];

  if (elfClass !== ELFCLASS32 && elfClass !== ELFCLASS64) {
    return { valid: false, error: `Unsupported ELF class: ${elfClass}`, architecture: '', class: '', endian: '', osabi: '', type: '', entryPoint: '', sections: [], dynamicSymbols: [], staticSymbols: [], il2cppExports: [], strings: [], il2cppStrings: [], warnings: [] };
  }

  const is64 = elfClass === ELFCLASS64;
  const le = elfData === ELFDATA2LSB;

  if (elfData !== ELFDATA2LSB && elfData !== ELFDATA2MSB) {
    return { valid: false, error: `Unsupported endianness: ${elfData}`, architecture: '', class: '', endian: '', osabi: '', type: '', entryPoint: '', sections: [], dynamicSymbols: [], staticSymbols: [], il2cppExports: [], strings: [], il2cppStrings: [], warnings: [] };
  }

  let off = 16;
  const type = readUInt16(buffer, off, le); off += 2;
  const machine = readUInt16(buffer, off, le); off += 2;
  const version = readUInt32(buffer, off, le); off += 4;
  const entry = readAddr(buffer, off, is64, le); off += is64 ? 8 : 4;
  const phoff = readOff(buffer, off, is64, le); off += is64 ? 8 : 4;
  const shoff = readOff(buffer, off, is64, le); off += is64 ? 8 : 4;
  const flags = readUInt32(buffer, off, le); off += 4;
  const ehsize = readUInt16(buffer, off, le); off += 2;
  const phentsize = readUInt16(buffer, off, le); off += 2;
  const phnum = readUInt16(buffer, off, le); off += 2;
  const shentsize = readUInt16(buffer, off, le); off += 2;
  const shnum = readUInt16(buffer, off, le); off += 2;
  const shstrndx = readUInt16(buffer, off, le); off += 2;

  const rawSections: RawSection[] = [];
  let shOffNum = Number(shoff);

  for (let i = 0; i < shnum; i++) {
    let soff = shOffNum + i * shentsize;
    const nameIdx = readUInt32(buffer, soff, le); soff += 4;
    const stype = readUInt32(buffer, soff, le); soff += 4;
    const sflags = readXWord(buffer, soff, is64, le); soff += is64 ? 8 : 4;
    const saddr = readAddr(buffer, soff, is64, le); soff += is64 ? 8 : 4;
    const soffset = readOff(buffer, soff, is64, le); soff += is64 ? 8 : 4;
    const ssize = readXWord(buffer, soff, is64, le); soff += is64 ? 8 : 4;
    const slink = readUInt32(buffer, soff, le); soff += 4;
    const sinfo = readUInt32(buffer, soff, le); soff += 4;
    const saddralign = readXWord(buffer, soff, is64, le); soff += is64 ? 8 : 4;
    const sentsize = readXWord(buffer, soff, is64, le); soff += is64 ? 8 : 4;

    rawSections.push({ nameIdx, type: stype, flags: sflags, addr: saddr, offset: soffset, size: ssize, link: slink, info: sinfo, addralign: saddralign, entsize: sentsize });
  }

  let sectionNames: string[] = [];
  if (shstrndx < rawSections.length) {
    const shstr = rawSections[shstrndx];
    const shstrData = buffer.slice(Number(shstr.offset), Number(shstr.offset) + Number(shstr.size));
    for (const sec of rawSections) {
      sectionNames.push(readString(shstrData, sec.nameIdx));
    }
  } else {
    warnings.push('Could not read section name string table');
    for (let i = 0; i < rawSections.length; i++) sectionNames.push(`section_${i}`);
  }

  const sections: SectionInfo[] = [];
  const sectionDataMap = new Map<number, Buffer>();

  for (let i = 0; i < rawSections.length; i++) {
    const rs = rawSections[i];
    const name = sectionNames[i];
    sections.push({
      name,
      type: getSectionTypeName(rs.type),
      address: '0x' + rs.addr.toString(16),
      size: Number(rs.size),
      flags: '0x' + rs.flags.toString(16),
      offset: Number(rs.offset)
    });

    if (rs.type !== SHT_NOBITS && rs.size > 0 && rs.offset > 0) {
      const start = Number(rs.offset);
      const end = start + Number(rs.size);
      if (end <= buffer.length) {
        sectionDataMap.set(i, buffer.slice(start, end));
      }
    }
  }

  function parseSymbols(symSecIdx: number, strSecIdx: number): RawSymbol[] {
    const symSec = rawSections[symSecIdx];
    const strSec = rawSections[strSecIdx];
    if (!symSec || !strSec) return [];

    const symData = sectionDataMap.get(symSecIdx);
    const strData = sectionDataMap.get(strSecIdx);
    if (!symData || !strData) return [];

    const entsize = Number(symSec.entsize) || (is64 ? 24 : 16);
    const count = Math.floor(Number(symSec.size) / entsize);
    const syms: RawSymbol[] = [];

    for (let i = 0; i < count; i++) {
      let soff = i * entsize;
      if (is64) {
        const nameIdx = readUInt32(symData, soff, le); soff += 4;
        const info = symData[soff++];
        const other = symData[soff++];
        const shndx = readUInt16(symData, soff, le); soff += 2;
        const value = readUInt64(symData, soff, le); soff += 8;
        const size = readUInt64(symData, soff, le); soff += 8;
        syms.push({ nameIdx, value, size, info, other, shndx });
      } else {
        const nameIdx = readUInt32(symData, soff, le); soff += 4;
        const value = BigInt(readUInt32(symData, soff, le)); soff += 4;
        const size = BigInt(readUInt32(symData, soff, le)); soff += 4;
        const info = symData[soff++];
        const other = symData[soff++];
        const shndx = readUInt16(symData, soff, le); soff += 2;
        syms.push({ nameIdx, value, size, info, other, shndx });
      }
    }
    return syms;
  }

  function convertSymbols(rawSyms: RawSymbol[], strSecIdx: number): SymbolEntry[] {
    const strData = sectionDataMap.get(strSecIdx);
    if (!strData) return [];

    const result: SymbolEntry[] = [];
    for (const rs of rawSyms) {
      const name = rs.nameIdx > 0 ? readString(strData, rs.nameIdx) : '';
      const type = rs.info & 0x0f;
      const bind = (rs.info >> 4) & 0x0f;

      result.push({
        name,
        value: '0x' + rs.value.toString(16),
        size: Number(rs.size),
        type: getSymbolTypeName(type),
        bind: getSymbolBindName(bind),
        visibility: getSymbolVisibility(rs.other),
        shndx: rs.shndx,
        sectionName: rs.shndx < sectionNames.length ? sectionNames[rs.shndx] : undefined
      });
    }
    return result;
  }

  let staticSymbols: SymbolEntry[] = [];
  let dynamicSymbols: SymbolEntry[] = [];
  let il2cppExports: Array<{ name: string; address: string }> = [];

  const symtabIdx = rawSections.findIndex((_, i) => sectionNames[i] === '.symtab');
  const strtabIdx = rawSections.findIndex((_, i) => sectionNames[i] === '.strtab');
  if (symtabIdx !== -1 && strtabIdx !== -1) {
    const raw = parseSymbols(symtabIdx, strtabIdx);
    staticSymbols = convertSymbols(raw, strtabIdx);
  } else {
    warnings.push('No .symtab found. Binary may be stripped.');
  }

  const dynsymIdx = rawSections.findIndex((_, i) => sectionNames[i] === '.dynsym');
  const dynstrIdx = rawSections.findIndex((_, i) => sectionNames[i] === '.dynstr');
  if (dynsymIdx !== -1 && dynstrIdx !== -1) {
    const raw = parseSymbols(dynsymIdx, dynstrIdx);
    dynamicSymbols = convertSymbols(raw, dynstrIdx);
  } else {
    warnings.push('No .dynsym found.');
  }

  for (const sym of [...dynamicSymbols, ...staticSymbols]) {
    if (sym.name.startsWith('il2cpp_')) {
      il2cppExports.push({ name: sym.name, address: sym.value });
    }
  }

  const strings: string[] = [];
  const il2cppStrings: string[] = [];

  const rodataIdx = rawSections.findIndex((_, i) => sectionNames[i] === '.rodata');
  if (rodataIdx !== -1) {
    const rodata = sectionDataMap.get(rodataIdx);
    if (rodata) {
      let current = '';
      for (let i = 0; i < rodata.length; i++) {
        const b = rodata[i];
        if (b >= 0x20 && b < 0x7f) {
          current += String.fromCharCode(b);
        } else {
          if (current.length >= 4) {
            strings.push(current);
            if (
              current.includes('il2cpp') ||
              current.includes('Unity') ||
              current.includes('Mono') ||
              current.includes('global-metadata') ||
              /^[A-Za-z_][A-Za-z0-9_]*(::[A-Za-z_][A-Za-z0-9_]*)+$/.test(current)
            ) {
              il2cppStrings.push(current);
            }
          }
          current = '';
        }
      }
    }
  }

  const dynstrData = sectionDataMap.get(dynstrIdx);
  if (dynstrData) {
    let offset = 0;
    while (offset < dynstrData.length) {
      const str = readString(dynstrData, offset);
      if (str.length >= 4) {
        strings.push(str);
        if (str.startsWith('il2cpp_') || str.includes('Unity')) {
          il2cppStrings.push(str);
        }
      }
      offset += str.length + 1;
      if (str.length === 0) offset++;
      if (offset >= dynstrData.length) break;
    }
  }

  const uniqueStrings = [...new Set(strings)].slice(0, 5000);
  const uniqueIl2cppStrings = [...new Set(il2cppStrings)];

  if (staticSymbols.length === 0 && dynamicSymbols.length === 0) {
    warnings.push('No symbols found. The binary appears to be fully stripped.');
  }

  return {
    valid: true,
    architecture: getMachineName(machine),
    class: is64 ? 'ELF64' : 'ELF32',
    endian: le ? 'Little Endian' : 'Big Endian',
    osabi: getOSABIName(osabi),
    type: getTypeName(type),
    entryPoint: '0x' + entry.toString(16),
    sections,
    dynamicSymbols,
    staticSymbols,
    il2cppExports,
    strings: uniqueStrings,
    il2cppStrings: uniqueIl2cppStrings,
    warnings
  };
}
