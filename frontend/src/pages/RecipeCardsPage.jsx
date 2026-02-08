/**
 * Технологические карты
 */

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { referenceAPI, productsAPI, recipeItemsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button, ButtonGroup } from '../components/Button';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell, TableContainer } from '../components/Table';
import { Modal } from '../components/Modal';
import { Input, Label, FormGroup } from '../components/Input';

const TopRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.lg};
`;

export const RecipeCardsPage = () => {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProduct(selectedProductId);
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId]);

  const loadReferenceData = async () => {
    setLoading(true);
    try {
      const [productsRes, ingredientsRes] = await Promise.all([
        referenceAPI.getProducts(),
        referenceAPI.getIngredients(),
      ]);
      setProducts(productsRes.data?.results || productsRes.data || []);
      setIngredients(ingredientsRes.data?.results || ingredientsRes.data || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProduct = async (id) => {
    setLoading(true);
    try {
      const res = await productsAPI.getById(id);
      setSelectedProduct(res.data);
    } catch (error) {
      console.error('Ошибка загрузки продукта:', error);
    } finally {
      setLoading(false);
    }
  };

  const ingredientTitleById = (id) =>
    ingredients.find(i => String(i.id) === String(id))?.title || '';

  const findIngredientByTitle = (title) => {
    const normalized = (title || '').trim().toLowerCase();
    return ingredients.find(i => i.title.toLowerCase() === normalized);
  };

  const productTitleById = (id) =>
    products.find(p => String(p.id) === String(id))?.title || '';

  const findProductByTitle = (title) => {
    const normalized = (title || '').trim().toLowerCase();
    return products.find(p => p.title.toLowerCase() === normalized);
  };

  const recipeItems = useMemo(
    () => (selectedProduct?.recipe_items || []),
    [selectedProduct]
  );
  const isStaff = user?.role === 'staff';
  const canEdit = Boolean(user) && !isStaff;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Недостаточно прав для изменения технологической карты');
      return;
    }
    if (!formData.ingredient) {
      alert('Пожалуйста, выберите позицию номенкулатуры из списка');
      return;
    }
    try {
      const payload = {
        product: selectedProductId,
        ingredient: formData.ingredient,
        quantity: formData.quantity,
      };
      if (editingItem) {
        await recipeItemsAPI.update(editingItem.id, payload);
      } else {
        await recipeItemsAPI.create(payload);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({});
      setIngredientSearch('');
      loadProduct(selectedProductId);
    } catch (error) {
      alert('Ошибка при сохранении технологической карты: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ingredient: item.ingredient,
      quantity: item.quantity,
    });
    setIngredientSearch('');
    setShowModal(true);
  };

  const handleDelete = async (itemId) => {
    if (!canEdit) {
      alert('Недостаточно прав для удаления позиции');
      return;
    }
    if (!window.confirm('Удалить позицию технологической карты?')) return;
    try {
      await recipeItemsAPI.delete(itemId);
      loadProduct(selectedProductId);
    } catch (error) {
      alert('Ошибка при удалении: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div>
      <Card>
      <CardHeader>
        <CardTitle>Технологические карты</CardTitle>
        {canEdit && (
          <Button
            variant="primary"
            onClick={() => {
              if (!selectedProductId) {
                alert('Сначала выберите продукт');
                return;
              }
              setShowModal(true);
            }}
          >
            + Добавить позицию
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <TopRow>
          <FormGroup style={{ minWidth: 260 }}>
            <Label>Продукт</Label>
            <Input
              list="recipe-product-options"
              value={productSearch || productTitleById(selectedProductId)}
              onChange={(e) => {
                const value = e.target.value;
                setProductSearch(value);
                const match = findProductByTitle(value);
                setSelectedProductId(match ? String(match.id) : '');
              }}
              placeholder="Начните вводить название..."
            />
            <datalist id="recipe-product-options">
              {products.map(p => (
                <option key={p.id} value={p.title} />
              ))}
            </datalist>
          </FormGroup>
        </TopRow>

          {loading && <p>Загрузка...</p>}

          {!selectedProductId && (
            <p style={{ color: theme.colors.textLight }}>
              Выберите продукт, чтобы увидеть его технологическую карту.
            </p>
          )}

          {selectedProductId && (
            <>
              {recipeItems.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>Позиция номенкулатуры</TableHeaderCell>
                        <TableHeaderCell>Количество</TableHeaderCell>
                        <TableHeaderCell>Ед. изм.</TableHeaderCell>
                        {canEdit && <TableHeaderCell>Действия</TableHeaderCell>}
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {recipeItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>{item.ingredient_title}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_display}</TableCell>
                          {canEdit && (
                            <TableCell>
                              <ButtonGroup>
                                <Button
                                  variant="default"
                                  onClick={() => handleEdit(item)}
                                  style={{ padding: `${theme.spacing.xs} ${theme.spacing.sm}`, fontSize: '12px' }}
                                >
                                  ✏️
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() => handleDelete(item.id)}
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
                <p style={{ color: theme.colors.textLight }}>
                  В технологической карте нет позиций.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          setFormData({});
          setIngredientSearch('');
        }}
        title={editingItem ? 'Редактировать позицию' : 'Добавить позицию'}
        footer={
          <>
            <Button onClick={() => {
              setShowModal(false);
              setEditingItem(null);
              setFormData({});
              setIngredientSearch('');
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {editingItem ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave}>
          <FormGroup>
            <Label>Позиция номенкулатуры</Label>
            <Input
              list="recipe-ingredient-options"
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
            <datalist id="recipe-ingredient-options">
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
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
              required
            />
          </FormGroup>
        </form>
      </Modal>
    </div>
  );
};
