  ✅ Test database migrations completed

      at log (tests/utils/migrations.ts:36:13)

warn: Permission denied {"requiredPermissions":["users:read"],"timestamp":"2025-12-24 21:26:24","userId":1}
warn: Permission denied {"requiredPermissions":["users:delete"],"timestamp":"2025-12-24 21:26:24","userId":1}
warn: Permission denied {"requiredPermissions":["users:read","users:update"],"timestamp":"2025-12-24 21:26:24","userId":1}
warn: Permission denied {"requiredPermissions":["users:read","users:delete"],"timestamp":"2025-12-24 21:26:24","userId":1}
warn: Permission denied (any) {"requiredPermissions":["admin:system","users:read"],"timestamp":"2025-12-24 21:26:24","userId":1}
warn: Permission denied (any) {"requiredPermissions":["admin:system","roles:manage"],"timestamp":"2025-12-24 21:26:24","userId":1}
warn: Ownership/Permission denied {"permission":"users:update","resourceOwnerId":10,"timestamp":"2025-12-24 21:26:24","userId":5}
warn: Ownership/Permission denied {"permission":"users:update","resourceOwnerId":10,"timestamp":"2025-12-24 21:26:24","userId":5}
 FAIL  tests/unit/permission.middleware.test.ts
  Permission Middleware
    requirePermission (single permission)
      ✕ should allow access when user has the required permission (17 ms)
      ✓ should deny access when user lacks the required permission (1 ms)
      ✓ should require authentication when userId is missing
    requirePermission (multiple permissions - all required)
      ✕ should allow access when user has all required permissions
      ✓ should deny access when user is missing any permission
    requireAnyPermission
      ✕ should allow access when user has at least one permission (2 ms)
      ✓ should deny access when user has none of the permissions (1 ms)
    requireOwnerOrPermission
      ✓ should allow access when user is the owner (1 ms)
      ✕ should check permission when user is not the owner (4 ms)
      ✓ should deny access when user is not owner and lacks permission (1 ms)

  ● Permission Middleware › requirePermission (single permission) › should allow access when user has the required permission

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 1, ["users:read"]

    Number of calls: 0

      46 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      47 |
    > 48 |             expect(mockHasAllPermissions).toHaveBeenCalledWith(1, ['users:read']);
         |                                           ^
      49 |             expect(nextFunction).toHaveBeenCalledWith();
      50 |         });
      51 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:48:43)

  ● Permission Middleware › requirePermission (multiple permissions - all required) › should allow access when user has all required permissions

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 1, ["users:read", "users:update"]

    Number of calls: 0

      82 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      83 |
    > 84 |             expect(mockHasAllPermissions).toHaveBeenCalledWith(1, ['users:read', 'users:update']);
         |                                           ^
      85 |             expect(nextFunction).toHaveBeenCalledWith();
      86 |         });
      87 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:84:43)

  ● Permission Middleware › requireAnyPermission › should allow access when user has at least one permission

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 1, ["admin:system", "users:read"]

    Number of calls: 0

      107 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      108 |
    > 109 |             expect(mockHasAnyPermission).toHaveBeenCalledWith(1, ['admin:system', 'users:read']);
          |                                          ^
      110 |             expect(nextFunction).toHaveBeenCalledWith();
      111 |         });
      112 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:109:42)

  ● Permission Middleware › requireOwnerOrPermission › should check permission when user is not the owner

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 5, "users:update"

    Number of calls: 0

      145 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      146 |
    > 147 |             expect(mockHasPermission).toHaveBeenCalledWith(5, 'users:update');
          |                                       ^
      148 |             expect(nextFunction).toHaveBeenCalledWith();
      149 |         });
      150 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:147:39)

Summary of all failing tests
 FAIL  src/features/auth/tests/integration/auth.api.test.ts
  ● User Authentication Integration Tests › GET /api/users/:id › should return 404 for non-existent user (requesting as admin)

    expect(received).toBe(expected) // Object.is equality

    Expected: 404
    Received: 200

      184 |       const response = await apiHelper.get('/api/users/99999', token);
      185 |
    > 186 |       expect(response.status).toBe(404);
          |                               ^
      187 |       expect(response.body.error.message).toContain('User not found');
      188 |     });
      189 |

      at Object.toBe (src/features/auth/tests/integration/auth.api.test.ts:186:31)

 FAIL  tests/unit/auth.middleware.test.ts
  ● Auth Middleware › requireAuth › should successfully authenticate with valid token

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:40:24)

  ● Auth Middleware › requireAuth › should throw 401 error if no authorization header

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:50:24)

  ● Auth Middleware › requireAuth › should throw 401 error if authorization header does not start with Bearer

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:64:24)

  ● Auth Middleware › requireAuth › should throw 401 error if token is null string

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:78:24)

  ● Auth Middleware › requireAuth › should throw 401 error if token verification fails

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:95:24)

  ● Auth Middleware › requireAuth › should throw 401 error if decoded token is a string

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:109:24)

  ● Auth Middleware › requireAuth › should throw 401 error if decoded token is missing required fields

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:123:24)

  ● Auth Middleware › requireAuth › should pass HttpException through if verifyToken throws one

    TypeError: _utils.logger.error is not a function

      79 |     next();
      80 |   } catch (error) {
    > 81 |     logger.error('Auth middleware error:', {
         |            ^
      82 |       error: error instanceof Error ? error.message : String(error),
      83 |       stack: error instanceof Error ? error.stack : undefined,
      84 |       ip: req.ip || req.connection?.remoteAddress || 'Unknown',

      at error (src/middlewares/auth.middleware.ts:81:12)
      at Object.<anonymous> (tests/unit/auth.middleware.test.ts:140:24)

 FAIL  src/features/auth/tests/unit/refresh-token.test.ts
  ● Refresh Token Business Logic › handleRefreshToken › should throw 401 if decoded token is a string

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      107 |       mockJwt.verifyToken.mockReturnValue('invalid-string-token');
      108 |
    > 109 |       await expect(handleRefreshToken('bad.token')).rejects.toThrow(HttpException);
          |                                                             ^
      110 |       await expect(handleRefreshToken('bad.token')).rejects.toMatchObject({
      111 |         status: 401,
      112 |         message: 'Invalid refresh token format',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/refresh-token.test.ts:109:61)

  ● Refresh Token Business Logic › handleRefreshToken › should throw 401 if decoded token has no id

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      117 |       mockJwt.verifyToken.mockReturnValue({ email: 'test@example.com' });
      118 |
    > 119 |       await expect(handleRefreshToken('no-id.token')).rejects.toThrow(HttpException);
          |                                                               ^
      120 |       await expect(handleRefreshToken('no-id.token')).rejects.toMatchObject({
      121 |         status: 401,
      122 |         message: 'Invalid refresh token format',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/refresh-token.test.ts:119:63)

  ● Refresh Token Business Logic › handleRefreshToken › should throw 404 if user not found

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      129 |       mockUserQueries.findUserById.mockResolvedValue(undefined);
      130 |
    > 131 |       await expect(handleRefreshToken('valid.token.deleted.user')).rejects.toThrow(HttpException);
          |                                                                            ^
      132 |       await expect(handleRefreshToken('valid.token.deleted.user')).rejects.toMatchObject({
      133 |         status: 404,
      134 |         message: 'User not found',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/refresh-token.test.ts:131:76)

  ● Refresh Token Business Logic › handleRefreshToken › should propagate HttpException from verifyToken

    expect(received).rejects.toThrow(expected)

    Expected message: ""

    Received function did not throw

      155 |       });
      156 |
    > 157 |       await expect(handleRefreshToken('expired.token')).rejects.toThrow(tokenExpiredError);
          |                                                                 ^
      158 |     });
      159 |
      160 |     it('should handle different user roles correctly', async () => {

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/refresh-token.test.ts:157:65)

 FAIL  src/features/auth/tests/unit/login.test.ts
  ● Login Business Logic › handleLogin › should throw 400 if email is missing

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      112 |
      113 |     it('should throw 400 if email is missing', async () => {
    > 114 |       await expect(handleLogin('', 'password123')).rejects.toThrow(HttpException);
          |                                                            ^
      115 |       await expect(handleLogin('', 'password123')).rejects.toMatchObject({
      116 |         status: 400,
      117 |         message: 'Email and password are required',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/login.test.ts:114:60)

  ● Login Business Logic › handleLogin › should throw 400 if password is missing

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      120 |
      121 |     it('should throw 400 if password is missing', async () => {
    > 122 |       await expect(handleLogin('test@example.com', '')).rejects.toThrow(HttpException);
          |                                                                 ^
      123 |       await expect(handleLogin('test@example.com', '')).rejects.toMatchObject({
      124 |         status: 400,
      125 |         message: 'Email and password are required',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/login.test.ts:122:65)

  ● Login Business Logic › handleLogin › should throw 404 if user not found

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      130 |       mockUserQueries.findUserByEmail.mockResolvedValue(undefined);
      131 |
    > 132 |       await expect(handleLogin('notfound@example.com', 'password123')).rejects.toThrow(HttpException);
          |                                                                                ^
      133 |       await expect(handleLogin('notfound@example.com', 'password123')).rejects.toMatchObject({
      134 |         status: 404,
      135 |         message: 'Email not registered',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/login.test.ts:132:80)

  ● Login Business Logic › handleLogin › should throw 401 if password is incorrect

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      141 |       (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);
      142 |
    > 143 |       await expect(handleLogin('test@example.com', 'wrongpassword')).rejects.toThrow(HttpException);
          |                                                                              ^
      144 |       await expect(handleLogin('test@example.com', 'wrongpassword')).rejects.toMatchObject({
      145 |         status: 401,
      146 |         message: 'Incorrect password',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/login.test.ts:143:78)

 FAIL  src/features/auth/tests/unit/register.test.ts
  ● Register Business Logic › handleRegister › should throw 409 if email already exists

    expect(received).rejects.toThrow(expected)

    Expected constructor: HttpException

    Received function did not throw

      139 |       mockUserQueries.findUserByEmail.mockResolvedValue(mockNewUser);
      140 |
    > 141 |       await expect(handleRegister(validRegisterData)).rejects.toThrow(HttpException);
          |                                                               ^
      142 |       await expect(handleRegister(validRegisterData)).rejects.toMatchObject({
      143 |         status: 409,
      144 |         message: 'Email already registered',

      at Object.toThrow (node_modules/expect/build/index.js:2155:20)
      at Object.toThrow (src/features/auth/tests/unit/register.test.ts:141:63)

 FAIL  src/features/admin-invite/tests/unit/create-invitation.test.ts
  ● Create Invitation Business Logic › handleCreateInvitation › should throw 409 if pending invitation exists for email

    expect(received).rejects.toMatchObject(expected)

    - Expected  - 4
    + Received  + 1

    - Object {
    -   "message": "An active invitation already exists for this email",
    -   "status": 409,
    - }
    + [TypeError: _utils.HttpException is not a constructor]

      152 |
      153 |       await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toThrow(HttpException);
    > 154 |       await expect(handleCreateInvitation(mockInvitationData, 1)).rejects.toMatchObject({
          |                                                                           ^
      155 |         status: 409,
      156 |         message: 'An active invitation already exists for this email',
      157 |       });

      at Object.toMatchObject (node_modules/expect/build/index.js:2155:20)
      at Object.toMatchObject (src/features/admin-invite/tests/unit/create-invitation.test.ts:154:75)

 FAIL  src/features/upload/tests/unit/create-upload.test.ts
  ● Create Upload Business Logic › handleCreateUpload › should throw 500 if database insert fails

    expect(received).rejects.toMatchObject(expected)

    - Expected  - 4
    + Received  + 1

    - Object {
    -   "message": "Failed to create upload record",
    -   "status": 500,
    - }
    + [TypeError: _utils.HttpException is not a constructor]

      153 |
      154 |       await expect(handleCreateUpload(mockFile, 1)).rejects.toThrow(HttpException);
    > 155 |       await expect(handleCreateUpload(mockFile, 1)).rejects.toMatchObject({
          |                                                             ^
      156 |         status: 500,
      157 |         message: 'Failed to create upload record',
      158 |       });

      at Object.toMatchObject (node_modules/expect/build/index.js:2155:20)
      at Object.toMatchObject (src/features/upload/tests/unit/create-upload.test.ts:155:61)

 FAIL  src/features/chatbot/tests/integration/e2e.test.ts (32.349 s)
  ● Chatbot E2E Integration Tests › RAG (Retrieval Augmented Generation) Flow › should retrieve relevant context from uploaded documents

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      367 |         response.includes("don't have") || // LLM might not have info if RAG failed
      368 |         response.includes("not sure")
    > 369 |       ).toBe(true);
          |         ^
      370 |     });
      371 |   });
      372 | });

      at Object.toBe (src/features/chatbot/tests/integration/e2e.test.ts:369:9)

 FAIL  tests/unit/permission.middleware.test.ts
  ● Permission Middleware › requirePermission (single permission) › should allow access when user has the required permission

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 1, ["users:read"]

    Number of calls: 0

      46 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      47 |
    > 48 |             expect(mockHasAllPermissions).toHaveBeenCalledWith(1, ['users:read']);
         |                                           ^
      49 |             expect(nextFunction).toHaveBeenCalledWith();
      50 |         });
      51 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:48:43)

  ● Permission Middleware › requirePermission (multiple permissions - all required) › should allow access when user has all required permissions

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 1, ["users:read", "users:update"]

    Number of calls: 0

      82 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      83 |
    > 84 |             expect(mockHasAllPermissions).toHaveBeenCalledWith(1, ['users:read', 'users:update']);
         |                                           ^
      85 |             expect(nextFunction).toHaveBeenCalledWith();
      86 |         });
      87 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:84:43)

  ● Permission Middleware › requireAnyPermission › should allow access when user has at least one permission

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 1, ["admin:system", "users:read"]

    Number of calls: 0

      107 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      108 |
    > 109 |             expect(mockHasAnyPermission).toHaveBeenCalledWith(1, ['admin:system', 'users:read']);
          |                                          ^
      110 |             expect(nextFunction).toHaveBeenCalledWith();
      111 |         });
      112 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:109:42)

  ● Permission Middleware › requireOwnerOrPermission › should check permission when user is not the owner

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: 5, "users:update"

    Number of calls: 0

      145 |             await middleware(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
      146 |
    > 147 |             expect(mockHasPermission).toHaveBeenCalledWith(5, 'users:update');
          |                                       ^
      148 |             expect(nextFunction).toHaveBeenCalledWith();
      149 |         });
      150 |

      at Object.toHaveBeenCalledWith (tests/unit/permission.middleware.test.ts:147:39)


Test Suites: 9 failed, 47 passed, 56 total
Tests:       25 failed, 609 passed, 634 total
Snapshots:   0 total
Time:        147.032 s
Ran all test suites matching user.*test\.ts.