import { useEffect, useState } from 'react';
import { localDb, type SaleWithDetails } from '../lib/localDb';
import type { EmployeeRecord } from '../lib/models';
import { Users, Plus, Edit2, Trash2, DollarSign, TrendingUp, MapPin, Phone } from 'lucide-react';

type Employee = EmployeeRecord;

interface EmployeeStats {
  employee: Employee;
  totalSales: number;
  totalCommission: number;
  salesCount: number;
}

type Props = {
  readOnly?: boolean;
};

export default function EmployeeCommission({ readOnly = false }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [updatingSaleId, setUpdatingSaleId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    phone: '',
    picture_data: '',
    commission_rate: '0.10',
    active: true,
  });

  useEffect(() => {
    fetchEmployees();
    fetchSales();
  }, []);

  useEffect(() => {
    const stats: EmployeeStats[] = employees.map((employee) => {
      const employeeSales = sales.filter((sale) => sale.employee_id === employee.id);
      const totalSales = employeeSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalCommission = employeeSales.reduce((sum, sale) => sum + sale.commission_amount, 0);

      return {
        employee,
        totalSales,
        totalCommission,
        salesCount: employeeSales.length,
      };
    });

    setEmployeeStats(stats);
  }, [employees, sales]);

  async function fetchEmployees() {
    try {
      setEmployees(await localDb.getEmployees());
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSales() {
    try {
      setSales(await localDb.getSalesWithDetails());
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    try {
      const employeeData = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        phone: formData.phone,
        picture_data: formData.picture_data,
        commission_rate: parseFloat(formData.commission_rate),
        active: formData.active,
      };

      if (editingEmployee) {
        await localDb.updateEmployee(editingEmployee.id, employeeData);
      } else {
        await localDb.createEmployee(employeeData);
      }

      setShowForm(false);
      setEditingEmployee(null);
      setFormData({
        name: '',
        email: '',
        address: '',
        phone: '',
        picture_data: '',
        commission_rate: '0.10',
        active: true,
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
    }
  }

  async function handleDelete(id: string) {
    if (readOnly) return;
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await localDb.deleteEmployee(id);
      fetchEmployees();
      fetchSales();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  }

  function openEditForm(employee: Employee) {
    if (readOnly) return;
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      address: employee.address || '',
      phone: employee.phone || '',
      picture_data: employee.picture_data || '',
      commission_rate: employee.commission_rate.toString(),
      active: employee.active,
    });
    setShowForm(true);
  }

  function handlePictureFile(file: File | null) {
    if (readOnly) return;
    if (!file) {
      setFormData((prev) => ({ ...prev, picture_data: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setFormData((prev) => ({ ...prev, picture_data: result }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaleEmployeeChange(saleId: string, employeeId: string) {
    if (readOnly) return;
    try {
      setUpdatingSaleId(saleId);
      await localDb.updateSaleEmployee(saleId, employeeId || null);
      await fetchSales();
    } catch (error) {
      console.error('Error updating sale employee:', error);
      alert(
        'Could not update the sale employee. Please restart the app with start.bat and try again.'
      );
    } finally {
      setUpdatingSaleId(null);
    }
  }

  async function handleDeleteSale(saleId: string) {
    if (readOnly) return;
    if (!confirm('Remove this sales record? This cannot be undone.')) return;

    try {
      await localDb.deleteSale(saleId);
      await fetchSales();
    } catch (error) {
      console.error('Error deleting sale:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('404')) {
        alert(
          'Could not delete the sales record: delete route not found. Restart the API server and try again.'
        );
      } else {
        alert(`Could not delete the sales record: ${message}`);
      }
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading employees...</div>;
  }

  const totalCommissionPaid = employeeStats.reduce((sum, stat) => sum + stat.totalCommission, 0);
  const totalSalesRevenue = employeeStats.reduce((sum, stat) => sum + stat.totalSales, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-800">Employee Commission</h2>
        </div>
        <button
          disabled={readOnly}
          onClick={() => {
            setShowForm(true);
            setEditingEmployee(null);
            setFormData({
              name: '',
              email: '',
              address: '',
              phone: '',
              picture_data: '',
              commission_rate: '0.10',
              active: true,
            });
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Employee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePictureFile(e.target.files?.[0] ?? null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {formData.picture_data && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={formData.picture_data}
                        alt="Employee preview"
                        className="w-14 h-14 rounded-full object-cover border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, picture_data: '' })}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove picture
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      required
                      value={formData.commission_rate}
                      onChange={(e) =>
                        setFormData({ ...formData, commission_rate: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <span className="text-gray-600">
                      ({(parseFloat(formData.commission_rate || '0') * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter as decimal (e.g., 0.10 for 10%)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="active" className="text-sm font-medium text-gray-700">
                    Active Employee
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={readOnly}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEmployee(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-600">Total Sales Revenue</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">${totalSalesRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-medium text-gray-600">Total Commission Paid</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">${totalCommissionPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-gray-600">Active Employees</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {employees.filter((e) => e.active).length}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {employeeStats.map((stat) => (
          <div
            key={stat.employee.id}
            className={`bg-white rounded-lg shadow-md p-6 border-2 ${
              stat.employee.active ? 'border-green-200' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                {stat.employee.picture_data ? (
                  <img
                    src={stat.employee.picture_data}
                    alt={stat.employee.name}
                    className="w-14 h-14 rounded-full object-cover border border-gray-200 mb-2"
                  />
                ) : null}
                <h3 className="text-lg font-bold text-gray-800">{stat.employee.name}</h3>
                <p className="text-sm text-gray-600">{stat.employee.email}</p>
                {stat.employee.phone ? (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {stat.employee.phone}
                  </p>
                ) : null}
                {stat.employee.address ? (
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {stat.employee.address}
                  </p>
                ) : null}
                {!stat.employee.active && (
                  <span className="inline-block mt-1 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={readOnly}
                  onClick={() => openEditForm(stat.employee)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  disabled={readOnly}
                  onClick={() => handleDelete(stat.employee.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Commission Rate:</span>
                <span className="font-semibold text-green-600">
                  {(stat.employee.commission_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Sales Count:</span>
                <span className="font-medium">{stat.salesCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Sales:</span>
                <span className="font-medium text-blue-600">${stat.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-gray-600">Total Commission:</span>
                <span className="font-bold text-green-600 text-lg">
                  ${stat.totalCommission.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {employeeStats.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No employees yet. Click "Add Employee" to get started.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Sales</h3>
        {sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No sales recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Employee
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Commission
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 10).map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">
                      {sale.products.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <select
                        value={sale.employee_id || ''}
                        disabled={updatingSaleId === sale.id || readOnly}
                        onChange={(e) => handleSaleEmployeeChange(sale.id, e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">No employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 text-right">{sale.quantity}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800 text-right">
                      ${sale.total_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-green-600 text-right">
                      ${sale.commission_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleDeleteSale(sale.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Remove sale record"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
