# 🕐 Complete Appointment Flow & Timezone Analysis

## 📋 **Overview**

This document traces the complete appointment flow from booking to database updates, showing how timezone consistency is maintained throughout using PST-aware utilities.

---

## 🔄 **1. USER BOOKING FLOW**

### **Step 1: Service & Staff Selection**

**File**: `app/booking/page.tsx` → `components/Booking/ServiceSelectionContent.tsx`

- User selects service and staff
- No timezone concerns here (just selections)

### **Step 2: Date & Time Selection**

**File**: `app/booking/datetime/page.tsx` → `components/Booking/DateTimeSelectionContent.tsx`

**Frontend Process:**

```typescript
// Line 157: User selects date
const dateStr = format(selectedDate, "yyyy-MM-dd"); // Browser date → YYYY-MM-DD

// Line 160-161: Fetch available slots
const response = await fetch(
  `/api/availability?date=${dateStr}&service=${serviceId}&staff=${staffId}`
);
```

**API Call**: `GET /api/availability`
**File**: `app/api/availability/route.ts`

**Timezone Handling:**

```typescript
// Lines 72-75: PST-aware date boundaries
const pstMidnightIso = dateToPstMidnight(validDate); // "2024-01-15T08:00:00.000Z"
const pstEndOfDayIso = createPstDateTime(validDate, "23:59"); // "2024-01-16T07:59:00.000Z"
const pstDate = parseISO(pstMidnightIso); // Date object for PST midnight

// Lines 160-163: Past slot filtering uses PST current time
const nowPstIso = new Date().toISOString();
const validSlotTimes = availableSlotTimes.filter((timeStr) => {
  const slotDateTimeIso = createPstDateTime(validDate, timeStr);
  return slotDateTimeIso > nowPstIso; // Compare ISO strings directly
});
```

**Service Call**: `AvailabilityService.getAvailableSlots()`
**File**: `lib/services/AvailabilityService.ts`

**Timezone Handling in Service:**

```typescript
// Lines 197-202: PST date boundaries for database queries
const dateStr = date.toISOString().split("T")[0]; // Extract YYYY-MM-DD
const pstStartOfDayIso = createPstDateTime(dateStr, "00:00");
const pstEndOfDayIso = createPstDateTime(dateStr, "23:59");
const startOfDay = parseISO(pstStartOfDayIso);
const endOfDay = parseISO(pstEndOfDayIso);
```

### **Step 3: Hold Creation**

**User clicks time slot** → **Creates 5-minute hold**

**API Call**: `POST /api/holds`
**File**: `app/api/holds/route.ts`

```typescript
// Lines 51-52: Convert frontend datetime to Date object
const slotDate = new Date(slotDateTime); // slotDateTime from frontend

// Lines 67-72: Create hold
const hold = await holdService.createHold(
  sessionId,
  staffId,
  serviceId,
  slotDate // Stores as UTC in database
);
```

**Service Call**: `BookingHoldService.createHold()`
**File**: `lib/services/BookingHoldService.ts`

**Timezone Handling:**

```typescript
// Hold stores slotDateTime as UTC Date in database
// Expiry calculated from current server time (timezone-agnostic)
const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
```

### **Step 4: Booking Confirmation**

**User fills customer details** → **Converts hold to booking**

**API Call**: `POST /api/holds/[holdId]/convert`
**File**: `app/api/holds/[holdId]/convert/route.ts`

```typescript
// Lines 87-88: Convert hold to booking first
await holdService.convertHoldToBooking(holdId);

// Lines 98-108: Create booking
const booking = await bookingService.createBooking(
  hold.staff_id,
  hold.service_id,
  hold.slot_datetime, // UTC Date from hold
  customerName,
  customerPhone,
  customer.id,
  customerEmail,
  true // skipAvailabilityCheck - holds guarantee availability
);
```

**Service Call**: `BookingService.createBooking()`
**File**: `lib/services/BookingService.ts`

**Database Storage:**

```typescript
// Lines 151-161: Create booking record
const booking = await tx.booking.create({
  data: {
    staff_id: staffId,
    service_id: serviceId,
    slot_datetime: slotDateTime, // Stored as UTC Date in PostgreSQL
    customer_name: customerName,
    customer_phone: customerPhone,
    final_price: finalPrice,
    // ... other fields
  },
});
```

---

## 🗃️ **2. DATABASE STORAGE**

**Table**: `booking`
**Key Fields**:

- `slot_datetime`: `TIMESTAMP` (UTC in PostgreSQL)
- `staff_id`, `service_id`, `customer_name`, etc.

**Timezone Strategy**:

- All datetimes stored as UTC in database
- Conversion to PST happens during retrieval/display

---

## 📅 **3. STAFF CALENDAR DISPLAY**

### **Step 1: Fetch Staff Appointments**

**Component**: `components/Staff/StaffScheduleContent.tsx`

```typescript
// Lines 167-170: Fetch appointments for date range
const response = await fetch(
  `/api/staff/appointments?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
);
```

**API Call**: `GET /api/staff/appointments`
**File**: `app/api/staff/appointments/route.ts`

**Timezone Handling:**

```typescript
// Lines 96-102: Date range filtering
if (validStartDate && validEndDate) {
  dateFilter = {
    slot_datetime: {
      gte: parseISO(validStartDate), // ISO string → Date object
      lte: parseISO(validEndDate), // ISO string → Date object
    },
  };
}

// Lines 132-157: Database query
const appointments = await prisma.booking.findMany({
  where: {
    staff_id: session.user.staffId,
    ...dateFilter, // Filters by UTC datetime
  },
  // ... includes and ordering
});
```

### **Step 2: Transform for Calendar Display**

**Component**: `components/Staff/StaffScheduleContent.tsx`

```typescript
// Lines 180-195: Transform API data using timezone-safe parsing
const realEvents: AppointmentEvent[] = data.appointments.map(
  (appointment: StaffAppointmentData) => {
    // Use timezone-safe calendar event creation
    const calendarEvent = createCalendarEvent({
      slot_datetime: appointment.slot_datetime,
      service: appointment.service,
      customer_name: appointment.customer_name,
    });

    const startTime = calendarEvent.start; // PST Date
    const endTime = calendarEvent.end; // PST Date

    return {
      id: appointment.id,
      title: `${appointment.service.name} - ${appointment.customer_name}`,
      start: startTime, // ✅ Correct PST time for calendar
      end: endTime, // ✅ Correct PST time for calendar
      // ... other fields
    };
  }
);
```

### **Step 3: Calendar Event Creation**

**Function**: `createCalendarEvent()`
**File**: `lib/utils/calendar.ts`

```typescript
// Lines 314-332: Creates PST-aware calendar events
export function createCalendarEvent(booking: {
  slot_datetime: string | Date;
  service: { duration_minutes: number };
  customer_name?: string;
  // ... other fields
}): {
  start: Date; // PST Date for React Big Calendar
  end: Date; // PST Date for React Big Calendar
  title: string;
  // ... other fields
} {
  const isoString =
    typeof booking.slot_datetime === "string"
      ? booking.slot_datetime
      : booking.slot_datetime.toISOString();

  const pstStart = getPstDateForCalculations(isoString); // UTC → PST
  const pstEnd = addMinutes(pstStart, booking.service.duration_minutes);

  return {
    start: pstStart, // ✅ PST Date - fixes 9am→2am bug
    end: pstEnd, // ✅ PST Date - fixes 9am→2am bug
    title: booking.customer_name || "Booking",
    ...booking,
  };
}
```

### **Step 4: React Big Calendar Display**

**Component**: `components/Calendar/BaseCalendar.tsx`

```typescript
// Lines 280-285: Convert UTC events to PST for display
const formattedEvents = useMemo(() => {
  return events.map((event) => {
    // Use timezone-safe PST date calculations for React Big Calendar
    const startPst = getPstDateForCalculations(event.start.toISOString());
    const endPst = getPstDateForCalculations(event.end.toISOString());

    return {
      ...event,
      start: startPst, // ✅ PST time - calendar shows "9:00 AM" correctly
      end: endPst, // ✅ PST time - calendar shows correct duration
    };
  });
}, [events]);
```

---

## ✏️ **4. APPOINTMENT UPDATES**

### **Step 1: Edit Appointment**

**User clicks appointment** → **Opens edit modal**

**Component**: `components/Common/AppointmentEditModal.tsx`

- Displays current appointment details in PST
- User can modify: customer info, price, status, notes

### **Step 2: Save Changes**

**API Call**: `PUT /api/staff/appointments/[appointmentId]` (Staff)
**API Call**: `PUT /api/admin/bookings/[bookingId]` (Admin)

**Files**:

- `app/api/staff/appointments/[appointmentId]/route.ts`
- `app/api/admin/bookings/[bookingId]/route.ts`

**Update Process:**

```typescript
// Both APIs follow same pattern
const updatedBooking = await prisma.booking.update({
  where: { id: appointmentId },
  data: {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail || null,
    final_price: price,
    status,
    notes: notes || null,
    // ❗ slot_datetime is NOT updated - time changes require new booking
  },
});
```

**Note**: Appointment times are immutable after creation. Time changes require creating a new booking and canceling the old one.

---

## 🔧 **5. TIMEZONE UTILITY FUNCTIONS**

### **Core PST Functions**

**File**: `lib/utils/calendar.ts`

| Function                               | Purpose                  | Input                        | Output                                                    |
| -------------------------------------- | ------------------------ | ---------------------------- | --------------------------------------------------------- |
| `createPstDateTime(dateStr, timeStr)`  | Create PST datetime      | `"2024-01-15"`, `"09:00"`    | `"2024-01-15T17:00:00.000Z"`                              |
| `parseIsoToPstComponents(isoString)`   | Parse UTC to PST display | `"2024-01-15T17:00:00.000Z"` | `{date: "2024-01-15", time: "09:00", display: "9:00 AM"}` |
| `getPstDateForCalculations(isoString)` | UTC to PST Date object   | `"2024-01-15T17:00:00.000Z"` | PST Date object                                           |
| `getTodayPst()`                        | Current date in PST      | None                         | `"2024-01-15"`                                            |
| `formatBookingTime(isoString)`         | Format for display       | `"2024-01-15T17:00:00.000Z"` | `{datetime: "January 15, 2024 at 9:00 AM"}`               |

### **Date Boundary Functions**

```typescript
// For database queries - ensures PST day boundaries
const dateStr = date.toISOString().split("T")[0];
const pstStartOfDayIso = createPstDateTime(dateStr, "00:00"); // "2024-01-15T08:00:00.000Z"
const pstEndOfDayIso = createPstDateTime(dateStr, "23:59"); // "2024-01-16T07:59:00.000Z"
const startOfDay = parseISO(pstStartOfDayIso);
const endOfDay = parseISO(pstEndOfDayIso);
```

---

## 🎯 **6. UNIFIED TIMEZONE STRATEGY**

### **Key Principles**

1. **Storage**: All datetimes stored as UTC in database
2. **Transport**: API exchanges use ISO strings (UTC)
3. **Display**: Convert to PST using timezone utilities
4. **Calculations**: Use PST-aware date boundaries

### **Timezone Flow**

```
User Browser (Local TZ)
    ↓
Frontend (Date selection)
    ↓
API (createPstDateTime conversion)
    ↓
Database (UTC storage)
    ↓
API Response (UTC ISO strings)
    ↓
Frontend (PST conversion for display)
    ↓
Calendar (PST display - 9:00 AM correct!)
```

### **Critical Fixes Applied**

1. **✅ Calendar Display Bug Fixed**:

   - **Before**: `new Date(date + "T" + time)` → 9am shows as 2am
   - **After**: `createCalendarEvent()` with `getPstDateForCalculations()` → 9am shows as 9am

2. **✅ Database Query Boundaries**:

   - **Before**: `new Date().setHours(0,0,0,0)` → Wrong day on Vercel
   - **After**: `createPstDateTime(dateStr, "00:00")` → Correct PST day

3. **✅ Availability Filtering**:
   - **Before**: `new Date() > slotDateTime` → Wrong timezone comparison
   - **After**: ISO string comparison → Timezone-agnostic

---

## 🚦 **7. APPOINTMENT FEATURES**

### **Core Features**

- ✅ **Booking Creation**: 5-minute hold system with PST scheduling
- ✅ **Calendar Display**: Staff/Admin calendars with correct PST times
- ✅ **Appointment Editing**: Update customer details, pricing, status, notes
- ✅ **Status Management**: CONFIRMED, PENDING, CANCELLED, NOSHOW
- ✅ **Real-time Updates**: Calendar refreshes after changes
- ✅ **Timezone Consistency**: All times display in PST regardless of server location

### **Advanced Features**

- ✅ **Hold System**: Prevents double-booking during selection
- ✅ **Analytics Tracking**: Hold creation, conversion, expiration
- ✅ **Customer Linking**: Guest customers auto-created and linked
- ✅ **Staff Self-Service**: Staff can edit their own appointments
- ✅ **Admin Override**: Admins can edit any appointment
- ✅ **Availability Engine**: Real-time slot calculation with conflict detection

### **Timezone-Related Features**

- ✅ **PST Business Hours**: 9 AM - 6 PM PST enforced
- ✅ **Operating Days**: Tuesday - Saturday in PST
- ✅ **Past Slot Filtering**: Prevents booking past times in PST
- ✅ **Day Boundary Accuracy**: Correct day boundaries regardless of server timezone
- ✅ **Calendar Consistency**: Same appointment shows same time across all views

---

## 🔄 **Summary Flow Diagram**

```
[User] → [Select Service/Staff]
    ↓
[Select Date/Time] → GET /api/availability (PST boundaries)
    ↓
[Create Hold] → POST /api/holds (5-min timer)
    ↓
[Enter Details] → POST /api/holds/[id]/convert
    ↓
[BookingService.createBooking()] → Database (UTC storage)
    ↓
[Staff Calendar] → GET /api/staff/appointments
    ↓
[createCalendarEvent()] → PST conversion
    ↓
[React Big Calendar] → Display "9:00 AM" ✅
    ↓
[Edit Appointment] → PUT /api/staff/appointments/[id]
    ↓
[Database Update] → Calendar Refresh → PST Display ✅
```

This flow ensures **complete timezone consistency** from booking creation to calendar display, fixing the 9am→2am bug and preventing all timezone-related issues.
