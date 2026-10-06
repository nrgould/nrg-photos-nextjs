import { crc32 } from "node:zlib";

/** A stored (uncompressed) zip. XMPs are a few KB each, so compression buys nothing. */
export function zip(files: { name: string; data: Uint8Array }[]) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of files) {
    const fileName = Buffer.from(name, "utf8");
    const crc = crc32(data);
    // Shared fields: version 2.0, UTF-8 names, stored, dated 1980-01-01, CRC, sizes, name length.
    const fields = (header: Buffer, at: number) => {
      header.writeUInt16LE(20, at);
      header.writeUInt16LE(0x0800, at + 2);
      header.writeUInt16LE(0x21, at + 8);
      header.writeUInt32LE(crc, at + 10);
      header.writeUInt32LE(data.length, at + 14);
      header.writeUInt32LE(data.length, at + 18);
      header.writeUInt16LE(fileName.length, at + 22);
    };
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    fields(head, 4);
    local.push(head, fileName, Buffer.from(data));
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    fields(entry, 6);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, fileName);
    offset += head.length + fileName.length + data.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, directory, end]));
}
