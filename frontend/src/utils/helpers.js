export const computeDaysRemaining = (endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const timeDiff = end - today;
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  return daysDiff;
};

export const computeDaysRemainingByStatus = (startDate, endDate, status) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (status === 'PREBOOKED') {
    // Calculate days from today (inclusive) until day before start_date (inclusive)
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 1); // Day before start_date
    
    const timeDiff = start - today;
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    // Add 1 to include today in the count
    return daysDiff < 0 ? 0 : daysDiff + 1;
  } else {
    // For ACTIVE and other statuses, use end_date
    return computeDaysRemaining(endDate);
  }
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

export const formatDaysRemaining = (days) => {
  if (days <= 0) {
    return '0 days';
  }
  
  // For days > 30, show as "X+ 30 days"
  if (days > 30) {
    const extraDays = days - 30;
    return `${extraDays}+ 30 days`;
  }
  
  // For days <= 30, show as "X days"
  return `${days} day${days !== 1 ? 's' : ''}`;
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
