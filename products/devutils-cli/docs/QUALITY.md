# DevUtils CLI Quality Checklist

## Required before selling as a developer tool

- [x] CLI runs on Node 18+
- [x] Core smoke tests exist
- [x] Syntax check passes
- [x] README explains limits and usage
- [x] Zero runtime dependency claim is true for core command path
- [ ] Network helper shell execution hardened
- [ ] CSV parser limitations documented in command help
- [ ] Release archive generated from tested source
- [ ] Gumroad file updated from tested source

## Known limitations

- Simple YAML/CSV conversions are intentionally lightweight.
- Network commands depend on system tools and network availability.
- `gen qr` uses a fallback visual approximation when no QR library is installed; do not market it as standards-compliant QR generation unless dependency-backed output is added.
