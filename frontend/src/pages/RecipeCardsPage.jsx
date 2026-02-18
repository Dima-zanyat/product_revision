/**
 * Технологические карты
 */

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { theme } from '../styles/theme';
import { referenceAPI, productsAPI, recipeItemsAPI, ingredientsAPI } from '../services/api';
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

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.md};
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: ${theme.colors.textDark};
`;

const DraftRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.md};
`;

export const RecipeCardsPage = () => {
  const [products, setProducts] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const [showModal, setShowModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [recipeProductId, setRecipeProductId] = useState('');
  const [recipeProductSearch, setRecipeProductSearch] = useState('');
  const [recipeItemsDraft, setRecipeItemsDraft] = useState([
    { ingredient: '', ingredientSearch: '', quantity: '' },
  ]);

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

  const handleDeleteProduct = async () => {
    if (!canEdit) {
      alert('Недостаточно прав для удаления продукта');
      return;
    }
    if (!selectedProductId) {
      alert('Сначала выберите продукт');
      return;
    }
    if (!window.confirm('Удалить технологическую карту (продукт) и все её позиции?')) {
      return;
    }
    try {
      await productsAPI.delete(selectedProductId);
      setSelectedProductId('');
      setSelectedProduct(null);
      setProductSearch('');
      loadReferenceData();
    } catch (error) {
      alert('Ошибка при удалении продукта: ' + (error.response?.data?.detail || error.message));
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

  const normalizeTitle = (value) => (value || '').trim();
  const normalizeKey = (value) => normalizeTitle(value).toLowerCase();

  const recipeItems = useMemo(
    () => (selectedProduct?.recipe_items || []),
    [selectedProduct]
  );
  const isStaff = user?.role === 'staff';
  const canEdit = Boolean(user) && !isStaff;

  const resetRecipeModal = () => {
    setShowRecipeModal(false);
    setRecipeProductId('');
    setRecipeProductSearch('');
    setRecipeItemsDraft([{ ingredient: '', ingredientSearch: '', quantity: '' }]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Недостаточно прав для изменения технологической карты');
      return;
    }
    try {
      let ingredientId = formData.ingredient;
      if (!ingredientId) {
        const title = normalizeTitle(ingredientSearch || ingredientTitleById(formData.ingredient));
        if (!title) {
          alert('Пожалуйста, выберите позицию номенкулатуры из списка');
          return;
        }
        const match = findIngredientByTitle(title);
        if (match) {
          ingredientId = match.id;
        } else {
          const created = await ingredientsAPI.create({ title });
          ingredientId = created.data?.id;
          if (created.data) {
            setIngredients(prev => [...prev, created.data]);
          }
        }
      }
      const payload = {
        product: selectedProductId,
        ingredient: ingredientId,
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

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      alert('Недостаточно прав для изменения технологической карты');
      return;
    }
    const productTitle = normalizeTitle(recipeProductSearch || productTitleById(recipeProductId));
    if (!productTitle) {
      alert('Пожалуйста, укажите название продукта');
      return;
    }

    const rows = recipeItemsDraft.filter(row => row.ingredient || row.quantity || row.ingredientSearch);
    if (rows.length === 0) {
      alert('Добавьте хотя бы одну позицию номенкулатуры');
      return;
    }
    if (rows.some(row => (!row.ingredient && !row.ingredientSearch) || row.quantity === '' || row.quantity === null)) {
      alert('Заполните все позиции номенкулатуры');
      return;
    }

    try {
      const productMatch = findProductByTitle(productTitle);
      let productId = productMatch ? String(productMatch.id) : '';
      let createdProduct = null;
      if (!productId) {
        const created = await productsAPI.create({ title: productTitle });
        createdProduct = created.data;
        productId = String(createdProduct?.id || '');
        if (!productId) {
          throw new Error('Не удалось создать продукт');
        }
      }

      const ingredientLookup = new Map(
        ingredients.map(i => [normalizeKey(i.title), String(i.id)])
      );
      const normalizedTitles = rows.map(row =>
        normalizeKey(row.ingredientSearch || ingredientTitleById(row.ingredient))
      );
      const uniqueTitles = new Set(normalizedTitles);
      if (uniqueTitles.size !== normalizedTitles.length) {
        alert('Позиции номенкулатуры не должны повторяться');
        return;
      }

      const createdIngredients = [];
      for (const row of rows) {
        const title = normalizeTitle(row.ingredientSearch || ingredientTitleById(row.ingredient));
        const key = normalizeKey(title);
        if (!title) {
          alert('Позиция номенкулатуры не заполнена');
          return;
        }
        let ingredientId = ingredientLookup.get(key);
        if (!ingredientId) {
          const createdIngredient = await ingredientsAPI.create({ title });
          const ingredientData = createdIngredient.data;
          ingredientId = String(ingredientData?.id || '');
          if (!ingredientId) {
            throw new Error('Не удалось создать позицию номенкулатуры');
          }
          ingredientLookup.set(key, ingredientId);
          if (ingredientData) {
            createdIngredients.push(ingredientData);
          }
        }

        const quantity = parseFloat(row.quantity);
        if (Number.isNaN(quantity) || quantity <= 0) {
          alert('Количество должно быть больше нуля');
          return;
        }
        await recipeItemsAPI.create({
          product: productId,
          ingredient: ingredientId,
          quantity,
        });
      }
      if (createdProduct) {
        setProducts(prev => [...prev, createdProduct]);
      }
      if (createdIngredients.length > 0) {
        setIngredients(prev => [...prev, ...createdIngredients]);
      }
      resetRecipeModal();
      setSelectedProductId(String(productId));
      setProductSearch(productTitle);
      loadProduct(productId);
    } catch (error) {
      alert('Ошибка при создании технологической карты: ' + (error.response?.data?.detail || error.message));
      if (recipeProductId) {
        loadProduct(recipeProductId);
      }
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

  const handleDraftIngredientChange = (index, value) => {
    const match = findIngredientByTitle(value);
    setRecipeItemsDraft(items =>
      items.map((row, i) =>
        i === index
          ? { ...row, ingredientSearch: value, ingredient: match ? match.id : '' }
          : row
      )
    );
  };

  const handleDraftQuantityChange = (index, value) => {
    setRecipeItemsDraft(items =>
      items.map((row, i) =>
        i === index ? { ...row, quantity: value } : row
      )
    );
  };

  const addDraftRow = () => {
    setRecipeItemsDraft(items => [
      ...items,
      { ingredient: '', ingredientSearch: '', quantity: '' },
    ]);
  };

  const removeDraftRow = (index) => {
    setRecipeItemsDraft(items => items.filter((_, i) => i !== index));
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
              resetRecipeModal();
              setShowRecipeModal(true);
            }}
          >
            + Добавить технологическую карту
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
          {selectedProductId && canEdit && (
            <Button variant="danger" onClick={handleDeleteProduct}>
              🗑️ Удалить технологическую карту
            </Button>
          )}
        </TopRow>

          {loading && <p>Загрузка...</p>}

          {!selectedProductId && (
            <p style={{ color: theme.colors.textLight }}>
              Выберите продукт, чтобы увидеть его технологическую карту.
            </p>
          )}

          {selectedProductId && (
            <>
              <SectionHeader>
                <SectionTitle>
                  Позиции номенкулатуры{selectedProduct?.title ? `: ${selectedProduct.title}` : ''}
                </SectionTitle>
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
                    + Добавить позицию номенкулатуры
                  </Button>
                )}
              </SectionHeader>
              {recipeItems.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>Позиция номенкулатуры</TableHeaderCell>
                        <TableHeaderCell>Количество (граммы)</TableHeaderCell>
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
            <Label>Количество (граммы)</Label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
              placeholder="Введите количество в граммах"
              required
            />
          </FormGroup>
        </form>
      </Modal>

      <Modal
        isOpen={showRecipeModal}
        onClose={resetRecipeModal}
        title="Добавить технологическую карту"
        footer={
          <>
            <Button onClick={resetRecipeModal}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleCreateRecipe}>
              Сохранить
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateRecipe}>
          <FormGroup>
            <Label>Продукт</Label>
            <Input
              list="recipe-product-create-options"
              value={recipeProductSearch || productTitleById(recipeProductId)}
              onChange={(e) => {
                const value = e.target.value;
                setRecipeProductSearch(value);
                const match = findProductByTitle(value);
                setRecipeProductId(match ? String(match.id) : '');
              }}
              placeholder="Начните вводить название..."
              required
            />
            <datalist id="recipe-product-create-options">
              {products.map(p => (
                <option key={p.id} value={p.title} />
              ))}
            </datalist>
          </FormGroup>

          {recipeItemsDraft.map((row, index) => (
            <DraftRow key={index}>
              <FormGroup style={{ flex: 1, minWidth: 220 }}>
                <Label>Позиция номенкулатуры</Label>
                <Input
                  list="recipe-ingredient-create-options"
                  value={row.ingredientSearch || ingredientTitleById(row.ingredient)}
                  onChange={(e) => handleDraftIngredientChange(index, e.target.value)}
                  placeholder="Начните вводить название..."
                  required
                />
              </FormGroup>
              <FormGroup style={{ width: 160 }}>
                <Label>Количество (граммы)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={row.quantity}
                  onChange={(e) => handleDraftQuantityChange(index, e.target.value)}
                  placeholder="Количество в граммах"
                  required
                />
              </FormGroup>
              {recipeItemsDraft.length > 1 && (
                <Button
                  variant="danger"
                  onClick={() => removeDraftRow(index)}
                  style={{ height: '38px' }}
                  type="button"
                >
                  🗑️
                </Button>
              )}
            </DraftRow>
          ))}
          <datalist id="recipe-ingredient-create-options">
            {ingredients.map(i => (
              <option key={i.id} value={i.title} />
            ))}
          </datalist>
          <Button variant="default" onClick={addDraftRow} type="button">
            + Добавить позицию номенкулатуры
          </Button>
        </form>
      </Modal>
    </div>
  );
};
