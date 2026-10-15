<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Teacher Dashboard</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <nav class="navbar">
        <h2>Welcome, Teacher <%= user.name %></h2>
        <a href="/logout" class="logout-btn">Logout</a>
    </nav>
    <div class="dashboard-container">
        <h3>Generate Lecture QR Code</h3>
        <% if (message) { %>
            <p class="success"><%= message %></p>
        <% } %>
        <form action="/teacher/generate-qr" method="POST">
            <div class="form-group">
                <label>Select Subject</label>
                <select name="subject_id" required>
                    <% subjects.forEach(sub => { %>
                        <option value="<%= sub.id %>"><%= sub.name %> (<%= sub.code %>)</option>
                    <% }) %>
                </select>
            </div>
            <button type="submit" class="btn">Generate QR Code</button>
        </form>

        <% if (qrImage) { %>
            <div class="qr-display">
                <h4>Scan this QR Code</h4>
                <img src="<%= qrImage %>" alt="Lecture QR Code">
            </div>
        <% } %>
    </div>
</body>
</html>
