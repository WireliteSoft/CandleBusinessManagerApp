export function registerEmployeeSalesRoutes(app, context) {
  const {
    prisma,
    parseOrThrow,
    toRowDates,
    employeeInput,
    saleInput,
    saleEmployeeUpdateInput,
  } = context;

  app.get('/api/employees', async (_req, res, next) => {
    try {
      const rows = await prisma.employee.findMany({ orderBy: { created_at: 'desc' } });
      res.json(toRowDates(rows));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/employees/active', async (_req, res, next) => {
    try {
      const rows = await prisma.employee.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      });
      res.json(toRowDates(rows));
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/employees', async (req, res, next) => {
    try {
      const data = parseOrThrow(employeeInput, req.body);
      const row = await prisma.employee.create({ data });
      res.status(201).json(toRowDates(row));
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/employees/:id', async (req, res, next) => {
    try {
      const data = parseOrThrow(employeeInput.partial(), req.body);
      const row = await prisma.employee.update({ where: { id: req.params.id }, data });
      res.json(toRowDates(row));
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/employees/:id', async (req, res, next) => {
    try {
      await prisma.employee.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/sales/record', async (req, res, next) => {
    try {
      const data = parseOrThrow(saleInput, req.body);
      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({ where: { id: data.product_id } });
        if (!product) {
          const error = new Error('Product not found');
          error.status = 404;
          throw error;
        }
        if (product.quantity_in_stock < data.quantity) {
          const error = new Error('Not enough inventory');
          error.status = 400;
          throw error;
        }

        await tx.product.update({
          where: { id: data.product_id },
          data: { quantity_in_stock: product.quantity_in_stock - data.quantity },
        });

        return tx.sale.create({ data });
      });

      res.status(201).json(toRowDates(result));
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/sales/details', async (_req, res, next) => {
    try {
      const rows = await prisma.sale.findMany({
        orderBy: { sale_date: 'desc' },
        include: { product: true, employee: true },
      });
      const mapped = rows.map((row) => ({
        id: row.id,
        product_id: row.product_id,
        employee_id: row.employee_id,
        quantity: row.quantity,
        sale_price: row.sale_price,
        total_amount: row.total_amount,
        commission_amount: row.commission_amount,
        sale_date: row.sale_date,
        created_at: row.created_at,
        products: row.product,
        employees: row.employee,
      }));
      res.json(toRowDates(mapped));
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/sales/:id', async (req, res, next) => {
    try {
      await prisma.sale.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  });

  async function updateSaleEmployeeHandler(req, res, next) {
    try {
      const { employee_id } = parseOrThrow(saleEmployeeUpdateInput, req.body);
      const updated = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({ where: { id: req.params.id } });
        if (!sale) {
          const error = new Error('Sale not found');
          error.status = 404;
          throw error;
        }

        let commissionAmount = 0;
        if (employee_id) {
          const employee = await tx.employee.findUnique({ where: { id: employee_id } });
          if (!employee) {
            const error = new Error('Employee not found');
            error.status = 404;
            throw error;
          }
          commissionAmount = sale.total_amount * employee.commission_rate;
        }

        return tx.sale.update({
          where: { id: sale.id },
          data: {
            employee_id,
            commission_amount: commissionAmount,
          },
        });
      });

      res.json(toRowDates(updated));
    } catch (e) {
      next(e);
    }
  }

  app.patch('/api/sales/:id/employee', updateSaleEmployeeHandler);
  app.post('/api/sales/:id/employee', updateSaleEmployeeHandler);
  app.put('/api/sales/:id/employee', updateSaleEmployeeHandler);
}
