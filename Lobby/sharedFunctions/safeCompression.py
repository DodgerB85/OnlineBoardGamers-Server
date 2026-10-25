import zlib

MAX_DECOMPRESSED_BYTES = 8_000_000


def safe_gzip_decompress(data, max_bytes=MAX_DECOMPRESSED_BYTES):
    """Decompress gzip data without letting a small payload expand without limit."""
    decompressor = zlib.decompressobj(16 + zlib.MAX_WBITS)
    output = decompressor.decompress(data, max_bytes)
    if decompressor.unconsumed_tail or not decompressor.eof or decompressor.unused_data:
        raise ValueError("Decompressed data is too large or invalid")
    return output
