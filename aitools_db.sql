-- Create the database
CREATE DATABASE ai_tools_db;
USE ai_tools_db;


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
select * from users;

UPDATE users SET role = 'admin' WHERE email = 'vinitnagar2104@gmail.com';
DROP TABLE IF EXISTS login_history;
select * from tools;


USE ai_tools_db;
select * from users;
UPDATE users SET role = 'admin' WHERE email = 'vinitnagar2104@gmail.com';
CREATE TABLE login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    device_info TEXT,
    FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
);
select * from login_history;
UPDATE users 
SET role = 'user' 
WHERE email = 'vinitgujjar9311@gmail.com';

SELECT id, name, email, role FROM users WHERE email = 'vinitnagar2104@gmail.com';
CREATE TABLE IF NOT EXISTS tools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    link VARCHAR(255),
    icon VARCHAR(50)
);


INSERT INTO tools (title, description, link, icon) VALUES 
('Text Generation', 'Advanced LLMs for content creation and analysis.', 'https://chat.openai.com', 'main.png'),
('Image Synthesis', 'Create visual assets using stable diffusion models.', 'https://midjourney.com', 'main.png'),
('Data Analytics', 'Automated insights from your uploaded datasets.', 'https://colab.research.google.com', 'main.png');

UPDATE tools 
SET icon = 'public\main.png' 
WHERE id = 1;


TRUNCATE Table tools;


ALTER TABLE tools
MODIFY COLUMN icon varchar(255);