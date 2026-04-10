import bcrypt

password = "admin123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print("BCrypt hash for 'admin123':", hashed.decode('utf-8'))
