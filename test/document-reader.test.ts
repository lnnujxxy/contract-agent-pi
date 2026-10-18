import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { readContractDocument } from "../src/document-reader.js";

const DOCX_BASE64 =
  "UEsDBBQAAAAIAAtFUl3XeYTq8QAAALgBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2QzU7DMBCE730Ky9cqccoBIZSkB36OwKE8wMreJFb9J69b2rdn00KREOVozXwz62nXB+/EHjPZGDq5qhspMOhobBg7+b55ru6koALBgIsBO3lEkut+0W6OCUkwHKiTUynpXinSE3qgOiYMrAwxeyj8zKNKoLcworppmlulYygYSlXmDNkvhGgfcYCdK+LpwMr5loyOpHg4e+e6TkJKzmoorKt9ML+Kqq+SmsmThyabaMkGqa6VzOL1jh/0lSfK1qB4g1xewLNRfcRslIl65xmu/0/649o4DFbjhZ/TUo4aiXh77+qL4sGG71+06jR8/wlQSwMEFAAAAAgAC0VSXSAbhuqyAAAALgEAAAsAAABfcmVscy8ucmVsc43Puw6CMBQG4J2naM4uBQdjDIXFmLAafICmPZRGeklbL7y9HRzEODie23fyN93TzOSOIWpnGdRlBQStcFJbxeAynDZ7IDFxK/nsLDJYMELXFs0ZZ57yTZy0jyQjNjKYUvIHSqOY0PBYOo82T0YXDE+5DIp6Lq5cId1W1Y6GTwPagpAVS3rJIPSyBjIsHv/h3ThqgUcnbgZt+vHlayPLPChMDB4uSCrf7TKzQHNKuorZvgBQSwMEFAAAAAgAC0VSXb7OMtrXAAAA+QAAABEAAAB3b3JkL2RvY3VtZW50LnhtbLOxr8jNUShLLSrOzM+zVTLUM1BSSM1Lzk/JzEu3VQoNcdO1UFIoLknMS0nMyc9LtVWqTC1Wsrfjsim3SslPLs1NzStRAJqQV2xVbquUUVJSYKWvX5yckZqbWKyXX5CaB5RLyy/KTSwBcovS9cvzi1IKivKTU4uLgRbk5ugbGRiY6ecmZuYp2XEpKABNTcpPqbQD0gUgoghElNi9bG9/sWXt0wkdTyf0KDyfsunZtJ1PJ0x8snMmkAGRe7Fu39Ml7Y8bmmz0QRpAZBGYLACTYEO5QCyYo+0AUEsBAhQDFAAAAAgAC0VSXdd5hOrxAAAAuAEAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACAALRVJdIBuG6rIAAAAuAQAACwAAAAAAAAAAAAAAgAEiAQAAX3JlbHMvLnJlbHNQSwECFAMUAAAACAALRVJdvs4y2tcAAAD5AAAAEQAAAAAAAAAAAAAAgAH9AQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAAwMAAAAA";
const PDF_BASE64 =
  "JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgMzAwIDE0NF0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNzM+PnN0cmVhbQpCVCAvRjEgMTIgVGYgMzYgMTAwIFRkIChQcm9jdXJlbWVudCBjb250cmFjdCBlcXVpcG1lbnQpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKMDAwMDAwMDIyNiAwMDAwMCBuIAowMDAwMDAwMzUwIDAwMDAwIG4gCnRyYWlsZXI8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MTkKJSVFT0YK";

test("reads a UTF-8 text contract and returns metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-agent-"));
  const file = join(root, "采购合同.txt");
  await writeFile(file, "采购合同\n甲方向乙方采购设备。", "utf8");

  const result = await readContractDocument(file, root);

  assert.equal(result.fileName, "采购合同.txt");
  assert.equal(result.format, "txt");
  assert.match(result.text, /采购设备/);
  assert.ok(result.sha256.length === 64);
});

test("reads pdf and docx contracts with the same reader boundary", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-agent-"));
  const docx = join(root, "采购合同.docx");
  const pdf = join(root, "procurement.pdf");
  await writeFile(docx, Buffer.from(DOCX_BASE64, "base64"));
  await writeFile(pdf, Buffer.from(PDF_BASE64, "base64"));

  const docxResult = await readContractDocument(docx, root);
  const pdfResult = await readContractDocument(pdf, root);

  assert.equal(docxResult.format, "docx");
  assert.match(docxResult.text, /采购设备/);
  assert.equal(pdfResult.format, "pdf");
  assert.match(pdfResult.text, /Procurement contract equipment/);
});

test("refuses unsupported files", async () => {
  const root = await mkdtemp(join(tmpdir(), "contract-agent-"));
  const file = join(root, "contract.exe");
  await writeFile(file, "not a contract", "utf8");

  await assert.rejects(() => readContractDocument(file, root), /unsupported contract format/i);
});
