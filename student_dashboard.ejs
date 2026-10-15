<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Student Dashboard</title>
    <link rel="stylesheet" href="/css/style.css">
    <!-- Include HTML5 QR Code Scanner Library -->
    <script src="https://unpkg.com/html5-qrcode"></script>
</head>
<body>
    <nav class="navbar">
        <h2>Welcome, Student <%= user.name %></h2>
        <a href="/logout" class="logout-btn">Logout</a>
    </nav>
    <div class="dashboard-container">
        <h3>Mark Attendance via QR & GPS</h3>
        
        <% if (message) { %> <p class="success"><%= message %></p> <% } %>
        <% if (error) { %> <p class="error"><%= error %></p> <% } %>

        <div id="reader" style="width: 300px; margin: auto;"></div>

        <form id="attendanceForm" action="/student/mark-attendance" method="POST" style="display:none;">
            <input type="hidden" name="token" id="token">
            <input type="hidden" name="latitude" id="latitude">
            <input type="hidden" name="longitude" id="longitude">
        </form>
    </div>

    <script>
        function onScanSuccess(decodedText, decodedResult) {
            // Stop scanner once scanned
            html5QrcodeScanner.clear();
            
            // Fetch device GPS location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    document.getElementById('token').value = decodedText;
                    document.getElementById('latitude').value = position.coords.latitude;
                    document.getElementById('longitude').value = position.coords.longitude;
                    document.getElementById('attendanceForm').submit();
                }, (error) => {
                    alert('GPS location required to mark attendance. Please enable location services.');
                });
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        }

        const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        html5QrcodeScanner.render(onScanSuccess);
    </script>
</body>
</html>
