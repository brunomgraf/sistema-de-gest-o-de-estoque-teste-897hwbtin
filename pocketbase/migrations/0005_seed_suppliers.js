migrate(
  (app) => {
    const suppliersCol = app.findCollectionByNameOrId('suppliers')

    try {
      app.findFirstRecordByData('suppliers', 'email', 'alpha@example.com')
      return // already seeded
    } catch (_) {}

    const s1 = new Record(suppliersCol)
    s1.set('name', 'Fornecedor Alpha')
    s1.set('email', 'alpha@example.com')
    s1.set('phone', '11999999991')

    const s2 = new Record(suppliersCol)
    s2.set('name', 'Beta Suprimentos')
    s2.set('email', 'beta@example.com')
    s2.set('phone', '11999999992')

    app.save(s1)
    app.save(s2)

    try {
      const items = app.findRecordsByFilter('items', '', '', 10, 0)
      if (items.length > 0) {
        items[0].set('suppliers', [s1.id])
        app.save(items[0])
      }
      if (items.length > 1) {
        items[1].set('suppliers', [s1.id, s2.id])
        app.save(items[1])
      }
    } catch (e) {}
  },
  (app) => {
    try {
      const s1 = app.findFirstRecordByData('suppliers', 'email', 'alpha@example.com')
      app.delete(s1)
    } catch (_) {}
    try {
      const s2 = app.findFirstRecordByData('suppliers', 'email', 'beta@example.com')
      app.delete(s2)
    } catch (_) {}
  },
)
