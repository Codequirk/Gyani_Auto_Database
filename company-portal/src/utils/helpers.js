export const computeDaysRemaining = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end - today;
  // Use Math.floor to get exact days: if end=today, result is 0
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
};

export const computeDaysRemainingByStatus = (startDate, endDate, status) => {
  // Calculate days remaining: end_date - today
  // ACTIVE (ends today Feb 20): Feb 20 - Feb 20 = 0 days remaining ✓
  // PREBOOKED (ends Feb 22, today Feb 20): Feb 22 - Feb 20 = 2 days remaining ✓
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let end;
  if (typeof endDate === 'string') {
    end = new Date(endDate.split('T')[0] + 'T00:00:00');
  } else {
    end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
  }
  
  const timeDiff = end - today;
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff >= 0 ? daysDiff : 0;
};

export const isPriority = (endDate) => {
  const daysRemaining = computeDaysRemaining(endDate);
  return daysRemaining >= 0 && daysRemaining <= 2;
};

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString();
};

export const getStatusBadgeColor = (status) => {
  const colors = {
    IDLE: 'bg-yellow-100 text-yellow-800',
    PREBOOKED: 'bg-purple-100 text-purple-800',
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};
