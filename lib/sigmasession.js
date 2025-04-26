import { fileURLToPath } from 'url';
import path from 'path';
import { writeFileSync } from 'fs';
import { File } from 'megajs';

async function SigmaSessionSavedCredentials(sessionData) {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFilePath);
  const credsFilePath = path.join(currentDir, '..', "sessions", "creds.json");
  
  const isMegaLink = sessionData.startsWith('SIGMA-MD~~');
  
  if (!isMegaLink) {
    console.error("Invalid input: Not a valid MEGA.nz session ID.");
    return;
  }

  const sessdata = sessionData.replace("SIGMA-MD~~", '');
  
  if (!sessdata.includes("#")) {
    console.error("Invalid MEGA.nz session ID format. It must contain both file ID and decryption key separated by #");
    return;
  }

  try {
    console.log("🔄 Downloading Session from MEGA.nz...");
    
    const file = File.fromURL(`https://mega.nz/file/${sessdata}`);
    
    const data = await new Promise((resolve, reject) => {
      file.download((err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // Verify if the downloaded data is valid JSON
    let parsedData;
    try {
      parsedData = JSON.parse(data.toString());
    } catch (parseError) {
      console.error("Downloaded data is not valid JSON:", parseError);
      return;
    }

    writeFileSync(credsFilePath, JSON.stringify(parsedData, null, 2));
    console.log("🔒 Credentials successfully downloaded and saved to creds.json");
  } catch (error) {
    console.error("❌ Error downloading from MEGA.nz:", error);
  }
}

export default SigmaSessionSavedCredentials;