routerAdd(
  'POST',
  '/backend/v1/gerar-oc-pdf',
  (e) => {
    const body = e.requestInfo().body
    const idCompra = body.id_compra

    if (!idCompra) {
      throw new BadRequestError('id_compra is required')
    }

    // Generate a mock valid PDF file content
    const pdfContent =
      '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [ 3 0 R ] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 612 792 ] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n4 0 obj\n<< /Length 57 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Ordem de Compra Gerada com Sucesso!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000066 00000 n \n0000000125 00000 n \n0000000282 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n390\n%%EOF'

    return e.blob(200, 'application/pdf', pdfContent)
  },
  $apis.requireAuth(),
)
