/**
 * Личный кабинет менеджера
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { usersAPI, productionsAPI, locationsAPI } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button, ButtonGroup } from '../components/Button';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell, TableContainer } from '../components/Table';
import { Modal } from '../components/Modal';
import { Input, Label, FormGroup, Select, PasswordInput } from '../components/Input';
import { theme } from '../styles/theme';

export const ManagerCabinetPage = () => {
  const { user, checkAuth } = useAuthStore();
  const [production, setProduction] = useState(null);
  const [productionForm, setProductionForm] = useState({});
  const [profileForm, setProfileForm] = useState({});
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'staff',
    email: '',
    first_name: '',
    last_name: '',
  });
  const [locationForm, setLocationForm] = useState({
    title: '',
    code: '',
    address: '',
  });

  useEffect(() => {
    if (user?.role === 'manager') {
      loadProduction();
      loadUsers();
      loadLocations();
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        password: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadProduction = async () => {
    if (!user?.production?.id) {
      setProduction(null);
      return;
    }
    try {
      const res = await productionsAPI.getById(user.production.id);
      setProduction(res.data);
      setProductionForm({
        name: res.data?.name || '',
        city: res.data?.city || '',
        legal_name: res.data?.legal_name || '',
        inn: res.data?.inn || '',
      });
    } catch (error) {
      console.error('Ошибка загрузки производства:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAll();
      const data = res.data?.results || res.data || [];
      setUsers(data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const res = await locationsAPI.getAll();
      const data = res.data?.results || res.data || [];
      setLocations(data);
    } catch (error) {
      console.error('Ошибка загрузки точек:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const openCreateLocation = () => {
    setEditingLocation(null);
    setLocationForm({ title: '', code: '', address: '' });
    setShowLocationModal(true);
  };

  const openEditLocation = (loc) => {
    setEditingLocation(loc);
    setLocationForm({
      title: loc.title || '',
      code: loc.code || '',
      address: loc.address || '',
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await locationsAPI.update(editingLocation.id, locationForm);
      } else {
        await locationsAPI.create(locationForm);
      }
      setShowLocationModal(false);
      setEditingLocation(null);
      setLocationForm({ title: '', code: '', address: '' });
      loadLocations();
    } catch (error) {
      alert('Ошибка при создании точки: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteLocation = async (loc) => {
    if (!window.confirm('Удалить точку производства?')) return;
    try {
      await locationsAPI.delete(loc.id);
      loadLocations();
    } catch (error) {
      alert('Ошибка при удалении: ' + (error.response?.data?.detail || error.message));
    }
  };
  const handleSaveProduction = async () => {
    if (!production?.id) {
      alert('Производство не найдено');
      return;
    }
    try {
      await productionsAPI.update(production.id, productionForm);
      alert('Данные производства обновлены');
      await checkAuth();
      loadProduction();
      setShowProductionModal(false);
    } catch (error) {
      alert('Ошибка при обновлении: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSaveProfile = async () => {
    try {
      const payload = {
        first_name: profileForm.first_name || '',
        last_name: profileForm.last_name || '',
        email: profileForm.email || '',
      };
      if (profileForm.password) {
        payload.password = profileForm.password;
      }
      await usersAPI.update(user.id, payload);
      alert('Профиль обновлен');
      setProfileForm({ ...profileForm, password: '' });
      await checkAuth();
      setShowProfileModal(false);
    } catch (error) {
      alert('Ошибка при обновлении профиля: ' + (error.response?.data?.detail || error.message));
    }
  };

  const openEditProfile = () => {
    setProfileForm({
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      password: '',
    });
    setShowProfileModal(true);
  };

  const openEditProduction = () => {
    setProductionForm({
      name: production?.name || '',
      city: production?.city || '',
      legal_name: production?.legal_name || '',
      inn: production?.inn || '',
    });
    setShowProductionModal(true);
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({
      username: '',
      password: '',
      role: 'staff',
      email: '',
      first_name: '',
      last_name: '',
    });
    setShowUserModal(true);
  };

  const openEditUser = (item) => {
    setEditingUser(item);
    setUserForm({
      username: item.username || '',
      password: '',
      role: item.role || 'staff',
      email: item.email || '',
      first_name: item.first_name || '',
      last_name: item.last_name || '',
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const payload = {
          email: userForm.email || '',
          first_name: userForm.first_name || '',
          last_name: userForm.last_name || '',
        };
        if (userForm.password) {
          payload.password = userForm.password;
        }
        await usersAPI.update(editingUser.id, payload);
      } else {
        await usersAPI.create({
          username: userForm.username,
          password: userForm.password,
          role: userForm.role,
          email: userForm.email,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
        });
      }
      setShowUserModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      alert('Ошибка при сохранении пользователя: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteUser = async (item) => {
    if (!window.confirm('Удалить пользователя?')) return;
    try {
      await usersAPI.delete(item.id);
      loadUsers();
    } catch (error) {
      alert('Ошибка при удалении: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (user?.role !== 'manager') {
    return (
      <Card>
        <CardContent>
          <p style={{ color: theme.colors.textLight }}>
            Личный кабинет доступен только для менеджеров.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleUsers = users.filter(u => u.id !== user.id);

  return (
    <div>
      <Card style={{ marginBottom: theme.spacing.lg }}>
        <CardHeader>
          <CardTitle>Мой профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Имя:</strong> {user?.first_name || '-'}</p>
          <p><strong>Фамилия:</strong> {user?.last_name || '-'}</p>
          <p><strong>Email:</strong> {user?.email || '-'}</p>
          <Button variant="primary" onClick={openEditProfile} style={{ marginTop: theme.spacing.md }}>
            Редактировать профиль
          </Button>
        </CardContent>
      </Card>

      <Card style={{ marginBottom: theme.spacing.lg }}>
        <CardHeader>
          <CardTitle>Производство</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>Название пекарни:</strong> {production?.name || '-'}</p>
          <p><strong>Город:</strong> {production?.city || '-'}</p>
          <p><strong>Название ИП:</strong> {production?.legal_name || '-'}</p>
          <p><strong>ИНН:</strong> {production?.inn || '-'}</p>
          <Button
            variant="primary"
            onClick={openEditProduction}
            style={{ marginTop: theme.spacing.md }}
            disabled={!production?.id}
          >
            Редактировать производство
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <Button variant="primary" onClick={openCreateUser}>
            + Добавить пользователя
          </Button>
        </CardHeader>
        <CardContent>
          {loading && <p>Загрузка...</p>}
          {!loading && visibleUsers.length === 0 && (
            <p style={{ color: theme.colors.textLight }}>Пользователей пока нет</p>
          )}
          {visibleUsers.length > 0 && (
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Логин</TableHeaderCell>
                    <TableHeaderCell>Роль</TableHeaderCell>
                    <TableHeaderCell>Имя</TableHeaderCell>
                    <TableHeaderCell>Email</TableHeaderCell>
                    <TableHeaderCell>Действия</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {visibleUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell>{[u.first_name, u.last_name].filter(Boolean).join(' ') || '-'}</TableCell>
                      <TableCell>{u.email || '-'}</TableCell>
                      <TableCell>
                        <ButtonGroup>
                          <Button variant="default" onClick={() => openEditUser(u)} style={{ padding: '6px 10px' }}>
                            ✏️
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteUser(u)} style={{ padding: '6px 10px' }}>
                            🗑️
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card style={{ marginTop: theme.spacing.lg }}>
        <CardHeader>
          <CardTitle>Точки производства</CardTitle>
          <Button variant="primary" onClick={openCreateLocation}>
            + Добавить точку
          </Button>
        </CardHeader>
        <CardContent>
          {loadingLocations && <p>Загрузка...</p>}
          {!loadingLocations && locations.length === 0 && (
            <p style={{ color: theme.colors.textLight }}>Точек пока нет</p>
          )}
          {locations.length > 0 && (
            <TableContainer>
              <Table>
                <TableHeader>
                  <tr>
                    <TableHeaderCell>Название</TableHeaderCell>
                    <TableHeaderCell>Код</TableHeaderCell>
                    <TableHeaderCell>Адрес</TableHeaderCell>
                    <TableHeaderCell>Действия</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {locations.map(loc => (
                    <TableRow key={loc.id}>
                      <TableCell>{loc.title}</TableCell>
                      <TableCell>{loc.code || '-'}</TableCell>
                      <TableCell>{loc.address || '-'}</TableCell>
                      <TableCell>
                        <ButtonGroup>
                          <Button variant="default" onClick={() => openEditLocation(loc)} style={{ padding: '6px 10px' }}>
                            ✏️
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteLocation(loc)} style={{ padding: '6px 10px' }}>
                            🗑️
                          </Button>
                        </ButtonGroup>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Редактировать профиль"
        footer={
          <>
            <Button onClick={() => setShowProfileModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSaveProfile}>
              Сохранить профиль
            </Button>
          </>
        }
      >
        <FormGroup>
          <Label>Имя</Label>
          <Input
            value={profileForm.first_name || ''}
            onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
            placeholder="Введите имя"
          />
        </FormGroup>
        <FormGroup>
          <Label>Фамилия</Label>
          <Input
            value={profileForm.last_name || ''}
            onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
            placeholder="Введите фамилию"
          />
        </FormGroup>
        <FormGroup>
          <Label>Email</Label>
          <Input
            type="email"
            value={profileForm.email || ''}
            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            placeholder="example@mail.com"
          />
        </FormGroup>
        <FormGroup>
          <Label>Новый пароль (если нужно)</Label>
          <PasswordInput
            value={profileForm.password || ''}
            onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
            placeholder="Введите новый пароль"
          />
        </FormGroup>
      </Modal>

      <Modal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        title="Редактировать производство"
        footer={
          <>
            <Button onClick={() => setShowProductionModal(false)}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSaveProduction}>
              Сохранить производство
            </Button>
          </>
        }
      >
        <FormGroup>
          <Label>Название пекарни</Label>
          <Input
            value={productionForm.name || ''}
            onChange={(e) => setProductionForm({ ...productionForm, name: e.target.value })}
            placeholder="Например: Пекарня Любимая"
          />
        </FormGroup>
        <FormGroup>
          <Label>Город</Label>
          <Input
            value={productionForm.city || ''}
            onChange={(e) => setProductionForm({ ...productionForm, city: e.target.value })}
            placeholder="Например: Москва"
          />
        </FormGroup>
        <FormGroup>
          <Label>Название ИП</Label>
          <Input
            value={productionForm.legal_name || ''}
            onChange={(e) => setProductionForm({ ...productionForm, legal_name: e.target.value })}
            placeholder="Например: ИП Иванов И.И."
          />
        </FormGroup>
        <FormGroup>
          <Label>ИНН (необязательно)</Label>
          <Input
            value={productionForm.inn || ''}
            onChange={(e) => setProductionForm({ ...productionForm, inn: e.target.value })}
            placeholder="10 или 12 цифр"
          />
        </FormGroup>
      </Modal>

      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
        footer={
          <>
            <Button onClick={() => {
              setShowUserModal(false);
              setEditingUser(null);
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSaveUser}>
              {editingUser ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveUser}>
          <FormGroup>
            <Label>Логин</Label>
            <Input
              value={userForm.username}
              onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
              disabled={Boolean(editingUser)}
              placeholder="Введите логин"
              required
            />
          </FormGroup>
          {!editingUser && (
            <FormGroup>
              <Label>Роль</Label>
              <Select
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="staff">staff</option>
                <option value="accounting">accounting</option>
              </Select>
            </FormGroup>
          )}
          <FormGroup>
            <Label>Имя</Label>
            <Input
              value={userForm.first_name}
              onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
              placeholder="Введите имя"
            />
          </FormGroup>
          <FormGroup>
            <Label>Фамилия</Label>
            <Input
              value={userForm.last_name}
              onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
              placeholder="Введите фамилию"
            />
          </FormGroup>
          <FormGroup>
            <Label>Email (необязательно)</Label>
            <Input
              type="email"
              value={userForm.email}
              onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              placeholder="example@mail.com (необязательно)"
            />
          </FormGroup>
          <FormGroup>
            <Label>{editingUser ? 'Новый пароль (если нужно)' : 'Пароль'}</Label>
            <PasswordInput
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder={editingUser ? 'Введите новый пароль' : 'Введите пароль'}
              required={!editingUser}
            />
          </FormGroup>
        </form>
      </Modal>

      <Modal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setEditingLocation(null);
        }}
        title={editingLocation ? 'Редактировать точку производства' : 'Добавить точку производства'}
        footer={
          <>
            <Button onClick={() => {
              setShowLocationModal(false);
              setEditingLocation(null);
            }}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSaveLocation}>
              {editingLocation ? 'Сохранить' : 'Добавить'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveLocation}>
          <FormGroup>
            <Label>Название</Label>
            <Input
              value={locationForm.title}
              onChange={(e) => setLocationForm({ ...locationForm, title: e.target.value })}
              placeholder="Например: Точка №1"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Код</Label>
            <Input
              value={locationForm.code}
              onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
              placeholder="Уникальный код точки"
              required
            />
          </FormGroup>
          <FormGroup>
            <Label>Адрес</Label>
            <Input
              value={locationForm.address}
              onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
              placeholder="Введите адрес"
            />
          </FormGroup>
        </form>
      </Modal>
    </div>
  );
};
