/**
 * Страница текущих остатков номенклатуры.
 */

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuthStore } from '../store/authStore';
import { ingredientInventoriesAPI, referenceAPI } from '../services/api';
import { theme } from '../styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from '../components/Table';
import { Input, Select, Label, FormGroup } from '../components/Input';

const Filters = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  flex-wrap: wrap;
  margin-bottom: ${theme.spacing.lg};
`;

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU');
};

export const IngredientInventoryPage = () => {
  const { user } = useAuthStore();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    q: '',
  });

  const canView = user?.role === 'manager' || user?.is_superuser;

  useEffect(() => {
    if (!canView) return;
    loadLocations();
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, filters.location, filters.q]);

  const loadLocations = async () => {
    try {
      const response = await referenceAPI.getLocations();
      setLocations(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки точек:', error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {
        ...(filters.location && { location: filters.location }),
        ...(filters.q && { q: filters.q }),
      };
      const response = await ingredientInventoriesAPI.getAll(params);
      setItems(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки остатков:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <Card>
        <CardContent>
          <p style={{ color: theme.colors.textLight }}>
            Раздел текущих остатков доступен только менеджеру.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Текущие остатки номенклатуры</CardTitle>
      </CardHeader>
      <CardContent>
        <Filters>
          <FormGroup style={{ minWidth: 240 }}>
            <Label>Точка производства</Label>
            <Select
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="">Все точки</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.title}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup style={{ minWidth: 280 }}>
            <Label>Поиск позиции номенклатуры</Label>
            <Input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Введите название"
            />
          </FormGroup>
        </Filters>

        {loading && <p>Загрузка...</p>}

        {!loading && items.length === 0 && (
          <p style={{ color: theme.colors.textLight }}>Данные по остаткам не найдены</p>
        )}

        {items.length > 0 && (
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Позиция номенклатуры</TableHeaderCell>
                  <TableHeaderCell>Остаток</TableHeaderCell>
                  <TableHeaderCell>Ед. изм.</TableHeaderCell>
                  <TableHeaderCell>Точка производства</TableHeaderCell>
                  <TableHeaderCell>Обновлено</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.ingredient_title}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.unit_display}</TableCell>
                    <TableCell>{item.location_title}</TableCell>
                    <TableCell>{formatDateTime(item.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};
