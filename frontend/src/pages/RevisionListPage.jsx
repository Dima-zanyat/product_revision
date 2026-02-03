/**
 * Страница списка ревизий
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useRevisionStore } from '../store/revisionStore';
import { theme } from '../styles/theme';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import { Button, ButtonGroup } from '../components/Button';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const RevisionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.lg};
`;

const RevisionCard = styled(Card)`
  cursor: pointer;
`;

const Status = styled.span`
  display: inline-block;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border-radius: ${theme.borderRadius.full};
  font-size: 12px;
  font-weight: 600;
  background: ${props => {
    switch (props.status) {
      case 'draft':
        return '#FFA50055';
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

export const RevisionListPage = () => {
  const navigate = useNavigate();
  const { revisions, loading, fetchRevisions } = useRevisionStore();
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const params = filter ? { status: filter } : {};
    fetchRevisions(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div>
      <h1>📋 Ревизии</h1>
      
      <ButtonGroup style={{ marginBottom: theme.spacing.lg, marginTop: theme.spacing.md }}>
        <Button variant="primary" onClick={() => navigate('/revisions/new')}>
          + Новая ревизия
        </Button>
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.gray}`,
          }}
        >
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="submitted">Отправлена на обработку</option>
          <option value="processing">В обработке</option>
          <option value="completed">Завершена</option>
        </select>
      </ButtonGroup>

      {loading && <p>Загрузка...</p>}

      <RevisionGrid>
        {revisions.map(revision => (
          <RevisionCard 
            key={revision.id}
            onClick={() => navigate(`/revisions/${revision.id}`)}
          >
            <CardHeader>
              <CardTitle>{revision.location_title}</CardTitle>
              <Status status={revision.status}>{revision.status_display}</Status>
            </CardHeader>
            <CardContent>
              <p><strong>Дата:</strong> {format(new Date(revision.revision_date), 'd MMMM yyyy', { locale: ru })}</p>
              <p><strong>Автор:</strong> {revision.author_username}</p>
            </CardContent>
          </RevisionCard>
        ))}
      </RevisionGrid>
      
      {!loading && revisions.length === 0 && (
        <Card style={{ textAlign: 'center', padding: theme.spacing.xl }}>
          <p style={{ color: theme.colors.textLight }}>
            Ревизии не найдены. Создайте первую ревизию!
          </p>
        </Card>
      )}
    </div>
  );
};