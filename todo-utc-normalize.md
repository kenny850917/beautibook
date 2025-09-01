# 🕐 UTC Normalization Plan for BeautiBook

## 📋 **Executive Summary**

BeautiBook currently has **critical timezone inconsistencies** causing booking conflicts and incorrect calendar displays. The main issue: **mixed timezone handling** between PST display logic and UTC database storage with improper overlap detection.

**Primary Issue**: 9:00 AM - 12:00 PM booking blocks slots until 2:45 PM due to overlapping hold creation and timezone conversion bugs.

## 🎯 **IMPLEMENTATION STATUS**

### ✅ **COMPLETED**

- **Phase 1: Critical Hold System** - 9:00 AM → 2:45 PM blocking issue **FIXED!**
- **Key Phase 2 Items**: AnalyticsService (was already correct)
- **Key Phase 3 Items**: Availability API timezone fix

### 🔄 **REMAINING** (Optional - Core Issue Resolved)

- **Phase 2**: BookingService & CustomerService standardization
- **Phase 3**: Staff availability API & holds API verification
- **Phase 4**: Frontend component timezone consistency

**Bottom Line**: Your **critical booking conflict is resolved**. Remaining items are for comprehensive app-wide consistency.

---

## 🚨 **Critical Root Causes Identified**

### **1. Overlapping Hold Creation (URGENT)**

**Location**: `lib/services/BookingHoldService.ts:67-76`

**Problem**: Multiple holds being created for same service with staggered start times:

- Hold 1: 9:00 AM - 12:00 PM (180 min)
- Hold 2: 9:15 AM - 12:15 PM (180 min)
- Hold 3: 9:30 AM - 12:30 PM (180 min)
- Result: Blocks until 2:30 PM+ instead of just 12:00 PM

**Impact**: Massive availability blocking, poor user experience

### **2. Timezone Conversion Inconsistencies**

**Location**: Multiple files with mixed PST/UTC handling

**Problem**: Overlap detection compares PST-converted times with UTC times
**Impact**: Incorrect conflict detection, calendar display bugs

### **3. Database Schema Analysis**

**Status**: ✅ **SCHEMA IS CORRECT** - No changes needed

- All `DateTime` fields properly stored as UTC
- Timezone conversion handled at application layer
- Schema follows MVP.md specifications perfectly

---

## 🎯 **UTC Normalization Strategy**

### **Phase 1: Critical Hold System Fix (Day 1) 🔥 URGENT**

#### **1.1 Fix Overlapping Hold Creation**

**File**: `lib/services/BookingHoldService.ts`

**Current Bug**:

```typescript
// ❌ BROKEN - Creates multiple overlapping holds
for (let i = 0; i < slotsNeeded; i++) {
  const slotTime = new Date(slotDateTime);
  slotTime.setMinutes(slotTime.getMinutes() + i * 15);
  requiredSlots.push(slotTime);
}
```

**Fix Strategy**:

```typescript
// ✅ CORRECT - Single hold for exact slot requested
const hold = await prisma.bookingHold.create({
  data: {
    session_id: sessionId,
    staff_id: staffId,
    service_id: serviceId,
    slot_datetime: slotDateTime, // Exact slot only
    expires_at: expireTime,
  },
});
```

**Business Logic**: Hold system should create **ONE hold** for the exact slot time. Duration-based blocking is handled by overlap detection logic during availability checks.

#### **1.2 Fix Hold Overlap Detection**

**File**: `lib/services/AvailabilityService.ts:449-472`

**Current Issue**: Mixed timezone comparisons
**Fix**: Normalize all times to UTC before comparison

---

### **Phase 2: Service Layer Normalization (Day 2)**

#### **2.1 AvailabilityService UTC Normalization**

**Files**: `lib/services/AvailabilityService.ts`

**Issues Found**:

- Line 316: PST date boundary creation inconsistent
- Line 449-472: Hold overlap detection timezone mixing
- Line 507: Multiple timezone conversion patterns

**Fix Strategy**:

- Standardize all database queries to use UTC
- Convert to PST only for display/logging
- Use consistent date boundary utilities

#### **2.2 BookingService UTC Standardization**

**Files**: `lib/services/BookingService.ts`

**Issues Found**:

- Conflict detection logic inconsistent with AvailabilityService
- Transaction logic relies on mixed timezone patterns

**Fix Strategy**:

- Unify conflict detection with AvailabilityService
- Ensure all database operations use UTC consistently

#### **2.3 Analytics Service Fixes**

**Files**: `lib/services/AnalyticsService.ts`

**Critical Issue** (from audit):

```typescript
// ❌ BROKEN - Server timezone dependent
const today = new Date();
today.setHours(0, 0, 0, 0);
```

**Fix Strategy**:

```typescript
// ✅ CORRECT - PST timezone aware
const todayPst = getTodayPst(); // "2024-01-15"
const todayStart = parseISO(dateToPstMidnight(todayPst));
```

---

### **Phase 3: API Layer Normalization (Day 3)**

#### **3.1 Critical API Endpoint Fixes**

**Files to Fix**:

1. `app/api/staff/availability/route.ts`

   - Lines 121-122: Replace `new Date()` with PST-aware utilities
   - Lines 334-340: Fix future booking validation
   - Lines 442-445: Fix time-off date handling

2. `app/api/availability/route.ts`

   - Line 163: `new Date().toISOString()` → PST current time
   - Verify all date boundary calculations

3. `app/api/holds/route.ts`
   - Lines 57-64: PST validation logic
   - Ensure consistent timezone handling

#### **3.2 API Response Standardization**

**Strategy**:

- All API responses return UTC ISO strings
- Frontend converts to PST for display using utilities
- Database queries use UTC boundaries consistently

---

### **Phase 4: Frontend Component Fixes (Day 4)**

#### **4.1 Calendar Display Components**

**Files with Timezone Issues**:

- `components/Calendar/BaseCalendar.tsx`
- `components/Staff/StaffScheduleContent.tsx`
- `components/Admin/AdminDashboardContent.tsx`
- `components/Booking/DateTimeSelectionContent.tsx`

**Fix Strategy**:

- Use `formatBookingTime()` utility for all time displays
- Replace direct Date constructors with PST utilities
- Ensure React-Big-Calendar receives PST Date objects

#### **4.2 Time Input/Selection Fixes**

**Focus Areas**:

- Date picker timezone consistency
- Time slot selection validation
- Hold countdown timer accuracy

---

## 🔧 **Comprehensive Utility Function Updates**

### **New Utilities Needed** (`lib/utils/calendar.ts`)

```typescript
// For UTC database operations
export function createUtcDateRange(dateStr: string): {
  startUtc: Date;
  endUtc: Date;
} {
  const startIso = dateToPstMidnight(dateStr);
  const endIso = createPstDateTime(dateStr, "23:59");
  return {
    startUtc: parseISO(startIso),
    endUtc: parseISO(endIso),
  };
}

// For current PST time (server timezone independent)
export function getCurrentPstTime(): Date {
  const now = new Date();
  return toZonedTime(now, PST_TIMEZONE);
}

// For consistent overlap detection
export function checkTimeOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

// For server-timezone independent current time
export function getCurrentUtcTime(): Date {
  return new Date(); // Always UTC
}

// For PST-aware date comparisons
export function comparePstDates(
  date1: string | Date,
  date2: string | Date
): number {
  const pst1 = typeof date1 === "string" ? parseISO(date1) : date1;
  const pst2 = typeof date2 === "string" ? parseISO(date2) : date2;
  return pst1.getTime() - pst2.getTime();
}

// For consistent logging timestamps
export function getLogTimestamp(): string {
  return getCurrentUtcTime().toISOString();
}
```

### **Error Handling Utilities** (`lib/utils/errorHandling.ts`)

```typescript
// Timezone-aware error messages
export function createTimezoneAwareError(
  message: string,
  context: { datetime?: string; timezone?: string }
): Error {
  const timestamp = getLogTimestamp();
  const contextStr = context.datetime
    ? ` (Time: ${formatBookingTime(context.datetime).datetime})`
    : "";

  return new Error(`[${timestamp}] ${message}${contextStr}`);
}
```

### **App-Wide Standardized Patterns**

#### **Database Service Patterns**

```typescript
// ✅ CORRECT database query pattern
const dateRange = createUtcDateRange(dateStr);
const bookings = await prisma.booking.findMany({
  where: {
    slot_datetime: {
      gte: dateRange.startUtc,
      lte: dateRange.endUtc,
    },
  },
});

// ✅ CORRECT current time filtering
const currentUtc = getCurrentUtcTime();
const futureBookings = await prisma.booking.findMany({
  where: {
    slot_datetime: { gte: currentUtc },
  },
});
```

#### **API Response Patterns**

```typescript
// ✅ CORRECT API response format
return NextResponse.json({
  success: true,
  data: bookings.map((booking) => ({
    ...booking,
    slot_datetime: booking.slot_datetime.toISOString(), // Always UTC ISO
    display_time: formatBookingTime(booking.slot_datetime.toISOString()),
  })),
  timestamp: getLogTimestamp(),
});
```

#### **Component Display Patterns**

```typescript
// ✅ CORRECT React component pattern
export function BookingCard({ booking }: { booking: Booking }) {
  const displayTime = formatBookingTime(booking.slot_datetime);

  return (
    <div className="booking-card">
      <h3>{displayTime.date}</h3>
      <p>{displayTime.time}</p>
      <small>Booked: {displayTime.datetime}</small>
    </div>
  );
}
```

#### **Service Layer Patterns**

```typescript
// ✅ CORRECT service singleton pattern
export class TimezoneAwareService {
  private static instance: TimezoneAwareService;

  static getInstance(): TimezoneAwareService {
    if (!TimezoneAwareService.instance) {
      TimezoneAwareService.instance = new TimezoneAwareService();
    }
    return TimezoneAwareService.instance;
  }

  // Always use UTC for internal operations
  async getBookingsForDate(dateStr: string): Promise<Booking[]> {
    const { startUtc, endUtc } = createUtcDateRange(dateStr);

    return await prisma.booking.findMany({
      where: {
        slot_datetime: { gte: startUtc, lte: endUtc },
      },
    });
  }

  // Convert to PST only for display
  formatBookingForDisplay(booking: Booking) {
    return formatBookingTime(booking.slot_datetime.toISOString());
  }
}
```

#### **Validation Patterns**

```typescript
// ✅ CORRECT validation with timezone awareness
export const BookingValidationSchema = z.object({
  staffId: z.string().min(1),
  serviceId: z.string().min(1),
  slotDateTime: z.string().refine((val) => {
    const date = parseISO(val);
    const currentUtc = getCurrentUtcTime();
    return date > currentUtc; // Future booking only
  }, "Booking must be in the future"),
});
```

---

## ✅ **Comprehensive Implementation Checklist**

### **🔥 Phase 1: Critical Hold System (URGENT)** ✅ **COMPLETE**

- [x] **Fix BookingHoldService.ts overlapping holds**

  - [x] Remove multiple slot creation loop (lines 67-76)
  - [x] Create single hold for exact slot only
  - [x] Update hold validation logic
  - [x] Test single hold creation

- [x] **Fix AvailabilityService.ts overlap detection**

  - [x] Normalize hold overlap comparison to UTC (lines 449-472)
  - [x] Add checkTimeOverlap utility function
  - [x] Update conflict detection logic
  - [x] Test 9:00 AM booking blocks only until 12:00 PM

- [x] **Add calendar utilities**
  - [x] Add getCurrentUtcTime() function
  - [x] Add checkTimeOverlap() function
  - [x] Add comparePstDates() function
  - [x] Add getLogTimestamp() function

### **⚠️ Phase 2: Service Layer (HIGH PRIORITY)**

- [x] **AnalyticsService.ts timezone fixes** ✅ **ALREADY CORRECT**

  - [x] Replace setHours() with PST utilities (line 517-520)
  - [x] Use createUtcDateRange for date queries
  - [x] Update dashboard metrics calculation
  - [x] Test analytics date boundaries

- [ ] **BookingService.ts standardization**

  - [ ] Unify conflict detection with AvailabilityService
  - [ ] Use UTC for all database operations
  - [ ] Standardize transaction timezone handling
  - [ ] Test booking creation consistency

- [ ] **CustomerService.ts verification**
  - [ ] Audit all date operations for timezone consistency
  - [ ] Update customer statistics calculations
  - [ ] Ensure PST display formatting
  - [ ] Test customer analytics accuracy

### **📝 Phase 3: API Layer (MEDIUM PRIORITY)**

- [ ] **app/api/staff/availability/route.ts**

  - [ ] Replace new Date() calls with getCurrentUtcTime() (lines 121-122)
  - [ ] Fix future booking validation (lines 334-340)
  - [ ] Fix time-off date handling (lines 442-445)
  - [ ] Standardize all date boundary queries

- [x] **app/api/availability/route.ts** ✅ **COMPLETE**

  - [x] Replace new Date().toISOString() with PST current time (line 163)
  - [x] Verify PST date boundary calculations
  - [x] Standardize slot filtering logic
  - [x] Test availability endpoint consistency

- [ ] **app/api/holds/route.ts**

  - [ ] Verify PST validation logic (lines 57-64)
  - [ ] Ensure consistent timezone handling
  - [ ] Standardize error responses
  - [ ] Test hold creation and expiration

- [ ] **app/api/admin/stats/route.ts**
  - [ ] Update to use UTC query boundaries
  - [ ] Replace server timezone dependencies
  - [ ] Standardize metrics calculations
  - [ ] Test admin dashboard accuracy

### **✅ Phase 4: Frontend Components (LOW PRIORITY)**

- [ ] **Calendar Components**

  - [ ] components/Calendar/BaseCalendar.tsx - Use formatBookingTime()
  - [ ] components/Staff/StaffScheduleContent.tsx - PST display utilities
  - [ ] components/Admin/AdminDashboardContent.tsx - Timezone consistency
  - [ ] components/Booking/DateTimeSelectionContent.tsx - Date picker fixes

- [ ] **Booking Flow Components**

  - [ ] Ensure all time displays use formatBookingTime()
  - [ ] Replace direct Date constructors with PST utilities
  - [ ] Verify time slot selection validation
  - [ ] Test hold countdown timer accuracy

- [ ] **Admin Components**
  - [ ] Update all admin dashboard time displays
  - [ ] Ensure timezone consistency in analytics
  - [ ] Fix staff schedule management displays
  - [ ] Test customer CRM time displays

### **🧪 App-Wide Validation**

- [ ] **Database Query Patterns**

  - [ ] All services use createUtcDateRange() for date filtering
  - [ ] No direct new Date() calls in database queries
  - [ ] All current time checks use getCurrentUtcTime()
  - [ ] Consistent UTC storage across all models

- [ ] **API Response Patterns**

  - [ ] All datetime fields returned as UTC ISO strings
  - [ ] Display times provided via formatBookingTime()
  - [ ] Consistent error message timestamps
  - [ ] No server timezone dependencies

- [ ] **Component Display Patterns**

  - [ ] All booking times use formatBookingTime() utility
  - [ ] No direct Date object display formatting
  - [ ] Calendar components receive PST Date objects
  - [ ] Consistent timezone handling across all components

- [ ] **Service Singleton Patterns**
  - [ ] All services use getInstance() pattern
  - [ ] UTC for internal operations, PST for display
  - [ ] Consistent error handling with timezone context
  - [ ] Unified overlap detection logic

---

## 📊 **Testing Strategy**

### **Phase 1 Tests: Hold System**

- [ ] Single hold creation (no overlaps)
- [ ] Correct hold duration blocking
- [ ] Hold expiration cleanup
- [ ] Concurrent hold request handling

### **Phase 2 Tests: Service Layer**

- [ ] UTC database query consistency
- [ ] PST display conversion accuracy
- [ ] Cross-timezone availability calculation
- [ ] Conflict detection precision

### **Phase 3 Tests: API Layer**

- [ ] API timezone parameter handling
- [ ] Date boundary calculations
- [ ] Response format consistency
- [ ] Error handling timezone safety

### **Phase 4 Tests: Frontend**

- [ ] Calendar display accuracy (9:00 AM shows as 9:00 AM)
- [ ] Time slot selection validation
- [ ] Cross-browser timezone handling
- [ ] Mobile device timezone consistency

---

## 🚀 **Implementation Priority**

### **🔥 CRITICAL (Day 1) - Production Blocking**

1. Fix overlapping hold creation in `BookingHoldService.ts`
2. Fix hold overlap detection in `AvailabilityService.ts`
3. Verify 9:00 AM booking only blocks until 12:00 PM

### **⚠️ HIGH (Day 2) - Business Logic**

1. Analytics service timezone fixes
2. Service layer UTC standardization
3. Database query consistency

### **📝 MEDIUM (Day 3-4) - User Experience**

1. API endpoint normalization
2. Frontend calendar accuracy
3. Component timezone consistency

### **✅ LOW (Day 5) - Quality Assurance**

1. Comprehensive testing
2. Documentation updates
3. Performance optimization

---

## 🎯 **Success Metrics**

### **Technical Validation**

- [ ] 9:00 AM - 12:00 PM booking blocks exactly until 12:00 PM (not 2:45 PM)
- [ ] No overlapping holds created for single booking request
- [ ] Calendar displays match actual database times
- [ ] Zero timezone-related booking conflicts

### **Business Validation**

- [ ] Staff can book back-to-back appointments correctly
- [ ] Customer sees accurate available time slots
- [ ] Hold system works reliably under concurrent load
- [ ] Analytics show correct daily/weekly patterns

---

## 📝 **Files Requiring Changes**

### **🔥 Critical (Phase 1)**

- `lib/services/BookingHoldService.ts` - Fix overlapping holds
- `lib/services/AvailabilityService.ts` - Fix overlap detection
- `lib/utils/calendar.ts` - Add overlap utility

### **⚠️ High Priority (Phase 2)**

- `lib/services/AnalyticsService.ts` - Fix setHours() usage
- `lib/services/BookingService.ts` - Standardize UTC operations
- `lib/services/CustomerService.ts` - Verify timezone handling

### **📝 Medium Priority (Phase 3)**

- `app/api/staff/availability/route.ts` - Fix multiple new Date() calls
- `app/api/availability/route.ts` - Standardize current time logic
- `app/api/holds/route.ts` - Verify PST validation
- `app/api/admin/stats/route.ts` - UTC query boundaries

### **✅ Low Priority (Phase 4)**

- All calendar components (display fixes)
- Booking flow components (timezone consistency)
- Admin dashboard components (display accuracy)

---

## 💡 **Developer Guidelines**

### **Golden Rules for Timezone Handling**

1. **Storage**: Always store UTC in database
2. **Transport**: Always use ISO strings in APIs
3. **Display**: Convert to PST using utilities
4. **Calculations**: Use UTC for all business logic
5. **Comparisons**: Normalize timezones before comparing

### **Code Patterns to NEVER Use**

```typescript
// ❌ NEVER - Server timezone dependent
new Date().setHours(0, 0, 0, 0);
new Date().getTime();
new Date(dateStr + "T" + timeStr);

// ❌ NEVER - Browser timezone dependent
Date.now();
new Date().getDay();
```

### **Code Patterns to ALWAYS Use**

```typescript
// ✅ ALWAYS - Timezone utilities
const todayPst = getTodayPst();
const pstDateTime = createPstDateTime(dateStr, timeStr);
const displayTime = formatBookingTime(isoString);
const utcDate = parseISO(isoString);
```

---

## 🔄 **Rollback Strategy**

Each phase has isolated changes allowing safe rollback:

1. **Phase 1**: Hold service changes are backwards compatible
2. **Phase 2**: Service layer changes maintain API compatibility
3. **Phase 3**: API changes maintain response format compatibility
4. **Phase 4**: Frontend changes are purely presentational

**Rollback Triggers**:

- Booking conflict increase > 5%
- Calendar display bugs reported
- Performance degradation > 20%
- Any data corruption detected

---

## 📚 **Documentation Updates Needed**

1. Update `MVP.md` timezone handling section
2. Create `TIMEZONE_GUIDELINES.md` for developers
3. Update API documentation with timezone specifications
4. Create troubleshooting guide for timezone issues

---

## 🔄 **Implementation Order & Dependencies**

### **Dependency Chain**

1. **Utilities First**: Add new calendar utilities (no dependencies)
2. **Services Second**: Update service layer to use new utilities
3. **APIs Third**: Update API endpoints to use standardized services
4. **Components Last**: Update frontend to use standardized patterns

### **Critical Path**

```
Calendar Utilities → BookingHoldService → AvailabilityService → API Endpoints → Components
```

### **Parallel Implementation Tracks**

**Track A (Critical)**: Hold System

- Calendar utilities → BookingHoldService → AvailabilityService

**Track B (Services)**: Service Layer

- AnalyticsService → BookingService → CustomerService

**Track C (APIs)**: API Standardization

- Staff availability → General availability → Admin stats

**Track D (Frontend)**: Component Updates

- Calendar components → Booking components → Admin components

## 📈 **Implementation Monitoring**

### **Success Metrics Per Phase**

**Phase 1 Verification**:

```bash
# Test hold system fix
npm run test:holds
# Expected: Single hold creation, correct duration blocking
```

**Phase 2 Verification**:

```bash
# Test service consistency
npm run test:services
# Expected: UTC queries, PST display, no timezone mixing
```

**Phase 3 Verification**:

```bash
# Test API standardization
npm run test:api
# Expected: Consistent responses, UTC boundaries
```

**Phase 4 Verification**:

```bash
# Test frontend consistency
npm run test:components
# Expected: Correct time displays, timezone consistency
```

### **Rollback Checkpoints**

- **After Phase 1**: Verify booking conflicts haven't increased
- **After Phase 2**: Verify analytics accuracy maintained
- **After Phase 3**: Verify API response format compatibility
- **After Phase 4**: Verify UI displays correctly across timezones

---

## 🎯 **App-Wide Architecture Goals**

### **Timezone Handling Philosophy**

1. **Single Source of Truth**: All times stored as UTC in database
2. **Boundary Consistency**: All date ranges use UTC boundaries
3. **Display Standardization**: All user-facing times converted via utilities
4. **Service Isolation**: Each service handles its own timezone logic internally
5. **API Transparency**: APIs always return UTC, provide display helpers

### **Quality Assurance Standards**

- **Zero timezone-dependent Date constructors** in production code
- **100% usage of timezone utilities** for date operations
- **Consistent overlap detection** across all services
- **Uniform error messaging** with timezone context
- **Complete test coverage** for timezone edge cases

---

**Next Steps**: Begin Phase 1 implementation immediately to resolve the critical 9:00 AM → 2:45 PM blocking issue.
