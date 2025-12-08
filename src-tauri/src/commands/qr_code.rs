use base64::{Engine as _, engine::general_purpose};
use rqrr::PreparedImage;

#[tauri::command]
pub fn decode_qr_code(image_data: String) -> Result<String, String> {
    // Decode base64 image
    let decoded = general_purpose::STANDARD
        .decode(image_data)
        .map_err(|e| e.to_string())?;

    // Load image
    let img = image::load_from_memory(&decoded)
        .map_err(|e| e.to_string())?;

    // Convert to luma
    let img = img.to_luma8();

    // Prepare image for QR detection
    let mut img = PreparedImage::prepare(img);

    // Try to find and decode QR codes
    let grids = img.detect_grids();

    let Some(grid) = grids.first() else {
        return Err("No QR code found".to_string());
    };
    let (_, content) = grid.decode().map_err(|e| format!("{:?}", e))?;
    Ok(content)
}
