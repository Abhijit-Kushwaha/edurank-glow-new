# Frontend Authentication Flow

## 🔄 Authentication Flow

### 1. Registration Flow
```
User visits /register
├── Enter email, password, name
├── Select account type:
│   ├── Independent Teacher/Student
│   └── Join existing organisation (optional)
├── Submit registration
├── Backend validates and creates account
├── Email verification sent (if enabled)
└── Redirect to login or dashboard
```

### 2. Login Flow
```
User visits /login
├── Enter email and password
├── Optional: Remember me
├── Submit login
├── Backend validates credentials
├── Returns JWT tokens (access + refresh)
├── Store tokens securely (httpOnly cookies)
└── Redirect based on user type and role
```

### 3. Role-Based Redirects
```
After successful login:
├── Check user.roles and user.organisationId
├── Independent Users (no org):
│   ├── IND_TEACHER → /dashboard/teacher
│   └── IND_STUDENT → /dashboard/student
├── Organisation Users:
│   ├── ADMIN → /org/{orgId}/admin
│   ├── TEACHER → /org/{orgId}/teacher
│   └── STUDENT → /org/{orgId}/student
└── Store redirect preference in localStorage
```

## 🏢 Organisation Management Flow

### Creating an Organisation
```
Admin user:
├── Navigate to /organisations/create
├── Enter org name, slug, domain (optional)
├── Submit creation
├── Backend creates org and assigns user as ADMIN
└── Redirect to /org/{orgId}/admin/dashboard
```

### Inviting Users
```
Org Admin:
├── Navigate to /org/{orgId}/users
├── Click "Invite User"
├── Enter email and select role
├── Submit invitation
├── Backend creates invite record
├── Email sent to user (async)
└── User appears in "Pending Invites" list
```

### Accepting Invitations
```
Invited User:
├── Receives email with invite link
├── Clicks link → /invite/accept/{token}
├── If not logged in → redirect to login
├── If logged in → show accept screen
├── Enter password (if new user) or confirm
├── Submit acceptance
├── Backend validates token and assigns role
└── Redirect to org dashboard
```

## 🔐 Permission-Guarded Routes

### Route Protection Strategy
```typescript
// Route definitions with permission requirements
const routes = [
  {
    path: '/org/:orgId/admin/*',
    component: AdminDashboard,
    permissions: ['org.manage'],
    roles: ['ADMIN']
  },
  {
    path: '/org/:orgId/teacher/*',
    component: TeacherDashboard,
    permissions: ['course.create', 'course.edit'],
    roles: ['TEACHER']
  },
  {
    path: '/org/:orgId/student/*',
    component: StudentDashboard,
    permissions: ['course.view'],
    roles: ['STUDENT']
  },
  {
    path: '/dashboard/teacher/*',
    component: IndependentTeacherDashboard,
    roles: ['IND_TEACHER']
  }
];
```

### Route Guard Implementation
```typescript
// Route guard component
const ProtectedRoute = ({ children, permissions, roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  // Check organisation isolation
  const orgId = useParams().orgId;
  if (orgId && user.organisationId !== orgId) {
    return <Navigate to="/unauthorized" />;
  }

  // Check role-based access
  if (roles && !roles.some(role => user.roles.includes(role))) {
    return <Navigate to="/unauthorized" />;
  }

  // Check permissions
  if (permissions && !permissions.every(perm => user.permissions.includes(perm))) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};
```

## 🎯 Dashboard Experiences

### Organisation Admin Dashboard
```
Header: Org name, user menu, notifications
Sidebar:
├── Dashboard (overview, stats)
├── Users (list, invite, manage roles)
├── Settings (org details, billing)
├── Analytics (usage reports)
└── Audit Logs (security events)
```

### Organisation Teacher Dashboard
```
Header: Org name, user menu
Sidebar:
├── My Courses (create, edit, publish)
├── Students (view enrolled students)
├── Assignments (create, grade)
├── Analytics (course performance)
└── Resources (shared materials)
```

### Organisation Student Dashboard
```
Header: Org name, user menu
Sidebar:
├── My Courses (enrolled courses)
├── Assignments (pending, completed)
├── Progress (learning analytics)
├── Certificates (earned badges)
└── Study Groups (peer collaboration)
```

### Independent Teacher Dashboard
```
Header: Personal branding, user menu
Sidebar:
├── My Content (courses, materials)
├── Students (enrolled learners)
├── Analytics (revenue, engagement)
├── Marketing (promote content)
└── Settings (profile, payments)
```

### Independent Student Dashboard
```
Header: Learning goals, user menu
Sidebar:
├── Discover (browse courses)
├── My Learning (enrolled courses)
├── Progress (learning path)
├── Achievements (badges, certificates)
└── Community (forums, study groups)
```

## 🔄 Token Management

### Access Token Handling
```typescript
// Axios interceptor for automatic token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = getStoredRefreshToken();
        const response = await axios.post('/api/auth/refresh', {
          refreshToken
        });

        // Store new tokens
        storeTokens(response.data.tokens);

        // Retry original request
        return axios(error.config);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);
```

### Session Management
```typescript
// Check session validity on app load
useEffect(() => {
  const validateSession = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      logout();
    }
  };

  if (hasValidTokens()) {
    validateSession();
  }
}, []);
```

## 🚨 Error Handling

### Authentication Errors
```typescript
const handleAuthError = (error) => {
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      showToast('Invalid email or password', 'error');
      break;
    case 'ACCOUNT_LOCKED':
      showToast('Account temporarily locked. Try again later.', 'warning');
      break;
    case 'EMAIL_NOT_VERIFIED':
      showToast('Please verify your email first', 'info');
      redirectToEmailVerification();
      break;
    default:
      showToast('Authentication failed', 'error');
  }
};
```

### Permission Errors
```typescript
const handlePermissionError = () => {
  showToast('You do not have permission to access this resource', 'error');
  redirectToDashboard();
};
```

## 📱 Responsive Design Considerations

### Mobile Authentication
```
- Simplified registration/login forms
- Touch-friendly inputs
- Biometric authentication (future)
- SMS verification option
```

### Mobile Dashboard
```
- Collapsible sidebar navigation
- Swipe gestures for navigation
- Bottom tab bar for main sections
- Pull-to-refresh for data updates
```

## 🔄 State Management

### Global Auth State
```typescript
interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  loading: boolean;
  error: string | null;
}

const useAuth = () => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (credentials) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await api.login(credentials);
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: error.message });
    }
  };

  return { ...state, login, logout, refresh };
};
```

This architecture provides a secure, scalable foundation for multi-tenant authentication with clear separation between organisation and independent users, comprehensive permission management, and excellent user experience across different device types.