/**
 * Страница детального просмотра ревизии
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useRevisionStore } from '../store/revisionStore';
import { useAuthStore } from '../store/authStore';
import { theme } from '../styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button, ButtonGroup } from '../components/Button';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell, TableContainer } from '../components/Table';
import { Modal } from '../components/Modal';
import { Input, Select, Label, FormGroup, Textarea } from '../components/Input';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { revisionItemsAPI, referenceAPI, incomingAPI } from '../services/api';

const warningBrown = '#8B5A2B';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.lg};
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'draft':
        return '#FFA50055';
      case 'submitted':
        return '#87CEEB55';
      case 'processing':
        return '#FFD70055';
      case 'completed':
        return '#4CAF5055';
      default:
        return '#E0E0E055';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'draft':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.success;
      default:
        return theme.colors.textDark;
    }
  }};
`;

const Section = styled(Card)`
  margin-bottom: ${theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: ${theme.spacing.md};
  color: ${theme.colors.textDark};
`;

const ReportStatus = styled.span`
  display: inline-block;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'ok':
        return '#4CAF5055';
      case 'warning':
        return '#8B5A2B33';
      case 'critical':
        return '#FF6B6B55';
      default:
        return '#E0E0E055';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'ok':
        return theme.colors.success;
      case 'warning':
        return warningBrown;
      case 'critical':
        return theme.colors.danger;
      default:
        return theme.colors.textDark;
    }
  }};
`;

const Difference = styled.span`
  color: ${props => {
    if (props.status === 'critical') return theme.colors.danger;
    if (props.status === 'warning') return warningBrown;
    if (props.status === 'ok') return theme.colors.success;
    if (props.value < 0) return theme.colors.danger;
    if (props.value > 0) return theme.colors.warning;
    return theme.colors.success;
  }};
  font-weight: 600;
`;

export const RevisionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentRevision, loading, fetchRevision, calculateRevision, submitRevision, approveRevision, rejectRevision, deleteRevision } = useRevisionStore();
  const { user } = useAuthStore();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [editingIncoming, setEditingIncoming] = useState(null);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [incomingIngredientSearch, setIncomingIngredientSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [formData, setFormData] = useState({});
  const [incomingFormData, setIncomingFormData] = useState({});
  const [incomingItems, setIncomingItems] = useState([]);
  const [showProducts, setShowProducts] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [reportFilter, setReportFilter] = useState('');

  useEffect(() => {
    if (id) {
      fetchRevision(id);
      loadReferenceData();
    }
  }, [id, fetchRevision]);

  useEffect(() => {
    if (currentRevision?.id) {
      loadIncoming();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRevision?.id, currentRevision?.revision_date, currentRevision?.location, currentRevision?.period_start_date]);

  const loadReferenceData = async () => {
    try {
      const [productsRes, ingredientsRes] = await Promise.all([
        referenceAPI.getProducts(),
        referenceAPI.getIngredients(),
      ]);
      setProducts(productsRes.data?.results || productsRes.data || []);
      setIngredients(ingredientsRes.data?.results || ingredientsRes.data || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };

  const loadIncoming = async () => {
    try {
      const dateFrom = currentRevision.period_start_date ||
        (currentRevision.revision_date ? `${currentRevision.revision_date.slice(0, 7)}-01` : undefined);
      const response = await incomingAPI.getAll({
        location: currentRevision.location,
        date_from: dateFrom,
        date_to: currentRevision.revision_date,
      });
      setIncomingItems(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки поступлений:', error);
    }
  };

  const handleCalculate = async () => {
    const message = user?.role === 'staff' 
      ? 'Вы уверены, что хотите рассчитать ревизию? Это действие нельзя отменить.'
      : 'Вы уверены, что хотите пересчитать ревизию?';
    
    if (window.confirm(message)) {
      try {
        await calculateRevision(id);
        alert('Ревизия успешно рассчитана!');
      } catch (error) {
        alert('Ошибка при расчете ревизии: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleSubmit = async () => {
    if (window.confirm('Вы уверены, что хотите отправить ревизию на обработку? После отправки вы не сможете её редактировать.')) {
      try {
        await submitRevision(id);
        alert('Ревизия успешно отправлена на обработку!');
        navigate('/');
      } catch (error) {
        alert('Ошибка при отправке ревизии: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleApprove = async () => {
    if (window.confirm('Вы уверены, что хотите подтвердить и завершить ревизию?')) {
      try {
        await approveRevision(id);
        alert('Ревизия успешно подтверждена и завершена!');
      } catch (error) {
        alert('Ошибка при подтверждении ревизии: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Пожалуйста, укажите причину отклонения');
      return;
    }
    
    if (window.confirm('Вы уверены, что хотите отклонить ревизию? Она будет возвращена в черновик.')) {
      try {
        await rejectRevision(id, rejectReason);
        setShowRejectModal(false);
        setRejectReason('');
        alert('Ревизия отклонена и возвращена в черновик');
      } catch (error) {
        alert('Ошибка при отклонении ревизии: ' + (error.response?.data?.error || error.message));
      }
    }
  };

  const handleDeleteRevision = async () => {
    if (!window.confirm('Удалить ревизию? Это действие нельзя отменить.')) {
      return;
    }
    try {
      await deleteRevision(id);
      alert('Ревизия удалена');
      navigate('/');
    } catch (error) {
      alert('Ошибка при удалении ревизии: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await revisionItemsAPI.updateProductItem(editingProduct.id, {
          ...formData,
          revision: id,
        });
      } else {
        await revisionItemsAPI.createProductItem({
          ...formData,
          revision: id,
        });
      }
      setShowProductModal(false);
      setFormData({});
      setEditingProduct(null);
      fetchRevision(id);
    } catch (error) {
      alert('Ошибка при сохранении продукта: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditProduct = (item) => {
    setEditingProduct(item);
    setFormData({
      product: item.product,
      actual_quantity: item.actual_quantity,
      comments: item.comments || '',
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (itemId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот продукт?')) {
      try {
        await revisionItemsAPI.deleteProductItem(itemId);
        fetchRevision(id);
      } catch (error) {
        alert('Ошибка при удалении продукта: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    try {
      if (!formData.ingredient) {
        alert('Пожалуйста, выберите ингредиент из списка');
        return;
      }
      if (editingIngredient) {
        await revisionItemsAPI.updateIngredientItem(editingIngredient.id, {
          ...formData,
          revision: id,
        });
      } else {
        await revisionItemsAPI.createIngredientItem({
          ...formData,
          revision: id,
        });
      }
      setShowIngredientModal(false);
      setFormData({});
      setEditingIngredient(null);
      fetchRevision(id);
    } catch (error) {
      alert('Ошибка при сохранении ингредиента: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditIngredient = (item) => {
    setEditingIngredient(item);
    setFormData({
      ingredient: item.ingredient,
      actual_quantity: item.actual_quantity,
      comments: item.comments || '',
    });
    setIngredientSearch('');
    setShowIngredientModal(true);
  };

  const findIngredientByTitle = (title) => {
    const normalized = (title || '').trim().toLowerCase();
    return ingredients.find(i => i.title.toLowerCase() === normalized);
  };

  const ingredientTitleById = (id) =>
    ingredients.find(i => String(i.id) === String(id))?.title || '';

  const handleDeleteIngredient = async (itemId) => {
    if (window.confirm('Вы уверены, что хотите удалить этот ингредиент?')) {
      try {
        await revisionItemsAPI.deleteIngredientItem(itemId);
        fetchRevision(id);
      } catch (error) {
        alert('Ошибка при удалении ингредиента: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleAddIncoming = async (e) => {
    e.preventDefault();
    try {
      if (!incomingFormData.ingredient) {
        alert('Пожалуйста, выберите ингредиент из списка');
        return;
      }
      const payload = {
        ingredient: incomingFormData.ingredient,
        quantity: incomingFormData.quantity,
        comment: incomingFormData.comment || '',
        location: currentRevision.location,
        date: incomingFormData.date || currentRevision.revision_date,
      };

      if (editingIncoming) {
        await incomingAPI.update(editingIncoming.id, payload);
      } else {
        await incomingAPI.create(payload);
      }
      setShowIncomingModal(false);
      setIncomingFormData({});
      setEditingIncoming(null);
      loadIncoming();
    } catch (error) {
      alert('Ошибка при сохранении поступления: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEditIncoming = (item) => {
    setEditingIncoming(item);
    setIncomingFormData({
      ingredient: item.ingredient,
      quantity: item.quantity,
      comment: item.comment || '',
      date: item.date,
    });
    setIncomingIngredientSearch('');
    setShowIncomingModal(true);
  };

  const handleDeleteIncoming = async (itemId) => {
    if (window.confirm('Удалить поступление?')) {
      try {
        await incomingAPI.delete(itemId);
        loadIncoming();
      } catch (error) {
        alert('Ошибка при удалении поступления: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleExportToExcel = (reports) => {
    // Создаем CSV файл (можно улучшить до настоящего Excel с библиотекой xlsx)
    const headers = ['Позиция номенкулатуры', 'Ожидаемый остаток', 'Фактический остаток', 'Разница', '% отклонения', 'Статус'];
    const rows = reports
      .sort((a, b) => {
        const statusOrder = { 'critical': 0, 'warning': 1, 'ok': 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      })
      .map(report => [
        report.ingredient_title,
        `${report.expected_quantity} ${report.unit_display}`,
        `${report.actual_quantity} ${report.unit_display}`,
        `${report.difference > 0 ? '+' : ''}${report.difference} ${report.unit_display}`,
        `${report.percentage}%`,
        report.status_display,
      ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `revision_${id}_report.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('revision', id);
      formData.append('type', type);

      const response = await revisionItemsAPI.uploadExcel(formData);
      
      if (response.data.success) {
        alert(`Успешно загружено ${response.data.count} записей`);
        fetchRevision(id);
      } else {
        alert('Ошибка при загрузке: ' + (response.data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      alert('Ошибка при загрузке файла: ' + (error.response?.data?.detail || error.message));
    }
    
    // Сброс input
    e.target.value = '';
  };

  if (loading && !currentRevision) {
    return <div>Загрузка...</div>;
  }

  if (!currentRevision) {
    return <div>Ревизия не найдена</div>;
  }

  const isStaff = user?.role === 'staff';
  const isPrivileged = Boolean(user?.is_superuser || user?.is_staff);
  const isManagerial =
    isPrivileged ||
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    user?.role === 'accounting';

  // Права по статусам должны совпадать с backend:
  // - staff: работает только с draft
  // - admin/manager/accounting: могут редактировать и пересчитывать draft/processing/completed
  const canEditItems =
    (isStaff && currentRevision.status === 'draft') ||
    (isManagerial && ['draft', 'processing', 'completed'].includes(currentRevision.status));

  const hasReports = (currentRevision.reports?.length || 0) > 0;
  const calculateButtonText = hasReports ? '🔄 Пересчитать ревизию' : '🧮 Рассчитать ревизию';

  // Проверка доступа для сотрудника
  if (isStaff && currentRevision.status !== 'draft') {
    return (
      <div>
        <Button onClick={() => navigate('/')}>← Назад к списку</Button>
        <Card style={{ marginTop: theme.spacing.lg, textAlign: 'center', padding: theme.spacing.xl }}>
          <p style={{ color: theme.colors.textLight }}>
            У вас нет доступа к этой ревизии. Вы можете просматривать только свои черновики.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <div>
          <Button onClick={() => navigate('/')}>← Назад к списку</Button>
        </div>
        <ButtonGroup>
          {user?.role === 'staff' && currentRevision.status === 'draft' && (
            <Button variant="primary" onClick={handleSubmit}>
              Отправить на обработку
            </Button>
          )}
          {isManagerial && (
            <>
              {(currentRevision.status === 'draft' || currentRevision.status === 'processing' || currentRevision.status === 'submitted') && (
                <>
                  <Button variant="success" onClick={handleApprove}>
                    ✅ Подтвердить
                  </Button>
                  {(currentRevision.status === 'processing' || currentRevision.status === 'submitted') && (
                    <Button variant="danger" onClick={() => setShowRejectModal(true)}>
                      ❌ Отклонить
                    </Button>
                  )}
                </>
              )}
              {['draft', 'processing', 'completed'].includes(currentRevision.status) && (
                <Button variant="primary" onClick={handleCalculate}>
                  {calculateButtonText}
                </Button>
              )}
              <Button variant="danger" onClick={handleDeleteRevision}>
                🗑️ Удалить
              </Button>
            </>
          )}
        </ButtonGroup>
      </PageHeader>

      <Section>
        <CardHeader>
          <CardTitle>{currentRevision.location_title}</CardTitle>
          <StatusBadge status={currentRevision.status}>
            {currentRevision.status_display}
          </StatusBadge>
        </CardHeader>
        <CardContent>
          <p><strong>Дата ревизии:</strong> {format(new Date(currentRevision.revision_date), 'd MMMM yyyy', { locale: ru })}</p>
          <p><strong>Автор:</strong> {currentRevision.author_username}</p>
          {currentRevision.comments && (
            <p><strong>Комментарии:</strong> {currentRevision.comments}</p>
          )}
        </CardContent>
      </Section>

      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <SectionTitle>Продажи ({currentRevision.product_items?.length || 0})</SectionTitle>
            {currentRevision.product_items && currentRevision.product_items.length > 5 && (
              <Button 
                variant="default"
                onClick={() => setShowProducts(!showProducts)}
              >
                {showProducts ? 'Скрыть' : 'Показать все'}
              </Button>
            )}
          </div>
          {canEditItems && (
            <ButtonGroup>
              <label style={{ cursor: 'pointer' }}>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={(e) => handleExcelUpload(e, 'products')}
                />
                <Button variant="default" as="span">
                  📤 Загрузить из Excel
                </Button>
              </label>
              <Button variant="primary" onClick={() => setShowProductModal(true)}>
                + Добавить продукт
              </Button>
            </ButtonGroup>
          )}
        </div>
        {currentRevision.product_items && currentRevision.product_items.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Продукт</TableHeaderCell>
                  <TableHeaderCell>Количество (шт.)</TableHeaderCell>
                  <TableHeaderCell>Комментарии</TableHeaderCell>
                  {canEditItems && (
                    <TableHeaderCell>Действия</TableHeaderCell>
                  )}
                </tr>
              </TableHeader>
              <TableBody>
                {(showProducts || currentRevision.product_items.length <= 5 
                  ? currentRevision.product_items 
                  : currentRevision.product_items.slice(0, 5)
                ).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.product_title}</TableCell>
                    <TableCell>{item.actual_quantity}</TableCell>
                    <TableCell>{item.comments || '-'}</TableCell>
                    {canEditItems && (
                      <TableCell>
                        <ButtonGroup>
                          <Button 
                            variant="default" 
                            onClick={() => handleEditProduct(item)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            ✏️
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={() => handleDeleteProduct(item.id)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            🗑️
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <p style={{ color: theme.colors.textLight }}>Продукты не добавлены</p>
        )}
      </Section>

      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <SectionTitle>Номенкулатура ({currentRevision.ingredient_items?.length || 0})</SectionTitle>
            {currentRevision.ingredient_items && currentRevision.ingredient_items.length > 5 && (
              <Button 
                variant="default"
                onClick={() => setShowIngredients(!showIngredients)}
              >
                {showIngredients ? 'Скрыть' : 'Показать все'}
              </Button>
            )}
          </div>
          {canEditItems && (
            <Button variant="primary" onClick={() => setShowIngredientModal(true)}>
              + Добавить ингредиент
            </Button>
          )}
        </div>
        {currentRevision.ingredient_items && currentRevision.ingredient_items.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Позиция номенкулатуры</TableHeaderCell>
                  <TableHeaderCell>Количество</TableHeaderCell>
                  <TableHeaderCell>Ед. изм.</TableHeaderCell>
                  <TableHeaderCell>Комментарии</TableHeaderCell>
                  {canEditItems && (
                    <TableHeaderCell>Действия</TableHeaderCell>
                  )}
                </tr>
              </TableHeader>
              <TableBody>
                {(showIngredients || currentRevision.ingredient_items.length <= 5 
                  ? currentRevision.ingredient_items 
                  : currentRevision.ingredient_items.slice(0, 5)
                ).map(item => (
                  <TableRow key={item.id}>
                    <TableCell>{item.ingredient_title}</TableCell>
                    <TableCell>{item.actual_quantity}</TableCell>
                    <TableCell>{item.unit_display}</TableCell>
                    <TableCell>{item.comments || '-'}</TableCell>
                    {canEditItems && (
                      <TableCell>
                        <ButtonGroup>
                          <Button 
                            variant="default" 
                            onClick={() => handleEditIngredient(item)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            ✏️
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={() => handleDeleteIngredient(item.id)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            🗑️
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <p style={{ color: theme.colors.textLight }}>Номенкулатура не добавлена</p>
        )}
      </Section>

      {(
        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <SectionTitle>Поступления</SectionTitle>
            <Button variant="primary" onClick={() => setShowIncomingModal(true)}>
              + Добавить поступление
            </Button>
          </div>
          {incomingItems && incomingItems.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Позиция номенкулатуры</TableHeaderCell>
                    <TableHeaderCell>Количество</TableHeaderCell>
                    <TableHeaderCell>Ед. изм.</TableHeaderCell>
                    <TableHeaderCell>Дата</TableHeaderCell>
                    <TableHeaderCell>Комментарии</TableHeaderCell>
                    <TableHeaderCell>Действия</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {incomingItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ingredient_title}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{item.unit_display}</TableCell>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.comment || '-'}</TableCell>
                      <TableCell>
                        <ButtonGroup>
                          <Button
                            variant="default"
                            onClick={() => handleEditIncoming(item)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleDeleteIncoming(item.id)}
                            style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                          >
                            🗑️
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <p style={{ color: theme.colors.textLight }}>Поступления не добавлены</p>
          )}
        </Section>
      )}

      {isManagerial &&
       ['draft', 'processing', 'completed'].includes(currentRevision.status) && (
        <Section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md }}>
            <SectionTitle>Отчет по ревизии</SectionTitle>
            <ButtonGroup>
              <select 
                value={reportFilter} 
                onChange={e => setReportFilter(e.target.value)}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.gray}`,
                }}
              >
                <option value="">Все статусы</option>
                <option value="critical">🔴 Критично</option>
                <option value="warning">⚠️ Внимание</option>
                <option value="ok">✅ Норма</option>
              </select>
              {currentRevision.reports && currentRevision.reports.length > 0 && (
                <Button 
                  variant="primary" 
                  onClick={() => handleExportToExcel(
                    reportFilter 
                      ? currentRevision.reports.filter(r => r.status === reportFilter)
                      : currentRevision.reports
                  )}
                >
                  📥 Экспорт в Excel
                </Button>
              )}
            </ButtonGroup>
          </div>
          {currentRevision.reports && currentRevision.reports.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Позиция номенкулатуры</TableHeaderCell>
                    <TableHeaderCell>Ожидаемый остаток</TableHeaderCell>
                    <TableHeaderCell>Фактический остаток</TableHeaderCell>
                    <TableHeaderCell>Разница</TableHeaderCell>
                    <TableHeaderCell>% отклонения</TableHeaderCell>
                    <TableHeaderCell>Статус</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {[...currentRevision.reports]
                    .filter(report => !reportFilter || report.status === reportFilter)
                    .sort((a, b) => {
                      // Сортировка: критичные -> внимание -> норма
                      const statusOrder = { 'critical': 0, 'warning': 1, 'ok': 2 };
                      return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
                    })
                    .map(report => (
                    <TableRow key={report.id}>
                      <TableCell>{report.ingredient_title}</TableCell>
                      <TableCell>{report.expected_quantity} {report.unit_display}</TableCell>
                      <TableCell>{report.actual_quantity} {report.unit_display}</TableCell>
                      <TableCell>
                        <Difference value={report.difference} status={report.status}>
                          {report.difference > 0 ? '+' : ''}{report.difference} {report.unit_display}
                        </Difference>
                      </TableCell>
                      <TableCell>{report.percentage}%</TableCell>
                      <TableCell>
                        <ReportStatus status={report.status}>
                          {report.status_display}
                        </ReportStatus>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <p style={{ color: theme.colors.textLight, textAlign: 'center', padding: theme.spacing.lg }}>
              Отчет еще не рассчитан. Нажмите "Пересчитать ревизию" для создания отчета.
            </p>
          )}
        </Section>
      )}

      <Modal
        isOpen={showProductModal}
        onClose={() => {
          setShowProductModal(false);
          setFormData({});
          setEditingProduct(null);
        }}
        title={editingProduct ? "Редактировать продукт" : "Добавить продукт"}
        footer={
          <>
            <Button onClick={() => {
              setShowProductModal(false);
              setFormData({});
              setEditingProduct(null);
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleAddProduct}>
              {editingProduct ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddProduct}>
          <FormGroup>
            <Label>Продукт</Label>
            <Select
              value={formData.product || ''}
              onChange={(e) => setFormData({ ...formData, product: e.target.value })}
              required
            >
              <option value="">Выберите продукт</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <Label>Количество (шт.)</Label>
            <Input
              type="number"
              min="0"
              value={formData.actual_quantity || ''}
              onChange={(e) => setFormData({ ...formData, actual_quantity: parseInt(e.target.value) })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Комментарии</Label>
            <Textarea
              value={formData.comments || ''}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            />
          </FormGroup>
        </form>
      </Modal>

      <Modal
        isOpen={showIngredientModal}
        onClose={() => {
          setShowIngredientModal(false);
          setFormData({});
          setEditingIngredient(null);
          setIngredientSearch('');
        }}
        title={editingIngredient ? "Редактировать ингредиент" : "Добавить ингредиент"}
        footer={
          <>
            <Button onClick={() => {
              setShowIngredientModal(false);
              setFormData({});
              setEditingIngredient(null);
              setIngredientSearch('');
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleAddIngredient}>
              {editingIngredient ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddIngredient}>
          <FormGroup>
            <Label>Позиция номенкулатуры</Label>
            <Input
              list="ingredient-options"
              value={ingredientSearch || ingredientTitleById(formData.ingredient)}
              onChange={(e) => {
                const value = e.target.value;
                setIngredientSearch(value);
                const match = findIngredientByTitle(value);
                setFormData({ ...formData, ingredient: match ? match.id : '' });
              }}
              required
              placeholder="Начните вводить название..."
            />
            <datalist id="ingredient-options">
              {ingredients.map(i => (
                <option key={i.id} value={i.title} />
              ))}
            </datalist>
          </FormGroup>
          <FormGroup>
            <Label>Количество</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={formData.actual_quantity || ''}
              onChange={(e) => setFormData({ ...formData, actual_quantity: parseFloat(e.target.value) })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Комментарии</Label>
            <Textarea
              value={formData.comments || ''}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            />
          </FormGroup>
        </form>
      </Modal>

      <Modal
        isOpen={showIncomingModal}
        onClose={() => {
          setShowIncomingModal(false);
          setIncomingFormData({});
          setEditingIncoming(null);
          setIncomingIngredientSearch('');
        }}
        title={editingIncoming ? "Редактировать поступление" : "Добавить поступление"}
        footer={
          <>
            <Button onClick={() => {
              setShowIncomingModal(false);
              setIncomingFormData({});
              setEditingIncoming(null);
              setIncomingIngredientSearch('');
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleAddIncoming}>
              {editingIncoming ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddIncoming}>
          <FormGroup>
            <Label>Позиция номенкулатуры</Label>
            <Input
              list="incoming-ingredient-options"
              value={incomingIngredientSearch || ingredientTitleById(incomingFormData.ingredient)}
              onChange={(e) => {
                const value = e.target.value;
                setIncomingIngredientSearch(value);
                const match = findIngredientByTitle(value);
                setIncomingFormData({ ...incomingFormData, ingredient: match ? match.id : '' });
              }}
              required
              placeholder="Начните вводить название..."
            />
            <datalist id="incoming-ingredient-options">
              {ingredients.map(i => (
                <option key={i.id} value={i.title} />
              ))}
            </datalist>
          </FormGroup>
          <FormGroup>
            <Label>Количество</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={incomingFormData.quantity || ''}
              onChange={(e) => setIncomingFormData({ ...incomingFormData, quantity: parseFloat(e.target.value) })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Дата</Label>
            <Input
              type="date"
              value={incomingFormData.date || currentRevision.revision_date}
              onChange={(e) => setIncomingFormData({ ...incomingFormData, date: e.target.value })}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Комментарии</Label>
            <Textarea
              value={incomingFormData.comment || ''}
              onChange={(e) => setIncomingFormData({ ...incomingFormData, comment: e.target.value })}
            />
          </FormGroup>
        </form>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectReason('');
        }}
        title="Отклонить ревизию"
        footer={
          <>
            <Button onClick={() => {
              setShowRejectModal(false);
              setRejectReason('');
            }}>
              Отмена
            </Button>
            <Button variant="danger" onClick={handleReject}>
              Отклонить
            </Button>
          </>
        }
      >
        <FormGroup>
          <Label>Причина отклонения *</Label>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Укажите причину отклонения ревизии..."
            required
          />
        </FormGroup>
      </Modal>
    </div>
  );
};
