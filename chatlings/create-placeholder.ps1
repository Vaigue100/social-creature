Add-Type -AssemblyName System.Drawing

$width = 400
$height = 400

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bmp)

# Fill with light gray
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 220, 220))
$graphics.FillRectangle($brush, 0, 0, $width, $height)

# Add text
$font = New-Object System.Drawing.Font('Arial', 24)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 150, 150))
$text = 'No Image'
$textSize = $graphics.MeasureString($text, $font)
$x = ($width - $textSize.Width) / 2
$y = ($height - $textSize.Height) / 2
$graphics.DrawString($text, $font, $textBrush, $x, $y)

# Save
$bmp.Save("$PSScriptRoot\assets\placeholder.png", [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bmp.Dispose()

Write-Host "Created placeholder.png in assets folder"
