export const formatBookingTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const formatBookingDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
};

export const calculateEndTime = (
  startDate: Date,
  durationMinutes: number,
): Date => {
  return new Date(startDate.getTime() + durationMinutes * 60000);
};

export const isBookingOverlapping = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date,
): boolean => {
  return start1 < end2 && start2 < end1;
};

export const getAvailableSlots = (
  date: Date,
  existingBookings: { start: Date; end: Date }[],
  slotDuration: number = 30,
): Date[] => {
  const slots: Date[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(17, 0, 0, 0);

  let current = new Date(dayStart);
  while (current < dayEnd) {
    const slotEnd = calculateEndTime(current, slotDuration);
    const hasConflict = existingBookings.some((b) =>
      isBookingOverlapping(current, slotEnd, b.start, b.end),
    );
    if (!hasConflict) {
      slots.push(new Date(current));
    }
    current = new Date(current.getTime() + slotDuration * 60000);
  }
  return slots;
};
