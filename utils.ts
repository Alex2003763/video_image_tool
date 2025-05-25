
export async function fetchVideoAsFile(videoUrl: string, defaultFileName: string = 'video_from_url'): Promise<File> {
  try {
    // Validate URL structure (basic check)
    new URL(videoUrl);
  } catch (e) {
    throw new Error('Invalid URL format.');
  }

  const corsProxy = 'https://odd-dream-5e6e.anthorytsang.workers.dev/?url=';
  const proxyUrl = corsProxy + encodeURIComponent(videoUrl);

  let response;
  try {
    response = await fetch(proxyUrl);
  } catch (networkError: any) {
    // Catch network errors (e.g., DNS resolution failure, proxy down)
    console.error('Network error fetching via proxy:', networkError);
    throw new Error(
      `Network error while trying to fetch video through proxy. The proxy or your connection might be down.`
    );
  }
  

  if (!response.ok) {
    // The proxy itself might return an error, or the proxied request failed.
    throw new Error(
      `Failed to fetch video through proxy (status: ${response.status}). The video URL might be invalid, or the server blocked the proxy.`
    );
  }

  if (response.type === "opaque") {
    // This means the request to the proxy was successful, but the response from the proxy
    // is opaque. This can happen if the proxy itself is misconfigured or if there's an
    // issue with the proxy's interaction with the target server that results in an
    // opaque response to the client. For our purpose, an opaque response is unusable
    // as we can't get the blob data.
    console.error('Received opaque response from proxy.');
    throw new Error(
        'Failed to load video: Received an opaque response from the proxy, which means the video data cannot be accessed. This might be a proxy issue or a restriction from the video server.'
    );
  }

  const blob = await response.blob();

  if (!blob.type || !blob.type.startsWith('video/')) {
    console.warn(`Unexpected MIME type from proxy: ${blob.type}. Attempting to use as video anyway.`);
    // Allow proceeding but warn.
  }

  let filename = defaultFileName;
  try {
    // Try to get filename from the original videoUrl, not the proxyUrl
    const path = new URL(videoUrl).pathname;
    const lastSegment = path.substring(path.lastIndexOf('/') + 1);
    if (lastSegment) {
      filename = decodeURIComponent(lastSegment);
    }
  } catch (e) {
    // Ignore, use default filename
    console.warn("Could not derive filename from original URL, using default.");
  }
  
  // Ensure filename has an extension if possible, or add one based on MIME type
  if (!filename.includes('.')) {
      const extension = blob.type ? (blob.type.split('/')[1] || 'mp4') : 'mp4';
      filename = `${filename}.${extension}`;
  }

  return new File([blob], filename, { type: blob.type || 'video/mp4' });
}


export async function fetchImageAsFile(imageUrl: string, defaultFileName: string = 'image_from_url'): Promise<File> {
  try {
    new URL(imageUrl);
  } catch (e) {
    throw new Error('Invalid URL format. Please enter a valid image URL.');
  }

  // Attempt 1: Direct fetch
  try {
    console.log(`Attempting direct fetch for: ${imageUrl}`);
    const directResponse = await fetch(imageUrl);
    if (directResponse.ok && directResponse.type !== 'opaque') {
      const blob = await directResponse.blob();
      if (blob.type && blob.type.startsWith('image/')) {
        console.log(`Direct fetch successful for: ${imageUrl}`);
        let filename = defaultFileName;
        try {
          const path = new URL(imageUrl).pathname;
          const lastSegment = path.substring(path.lastIndexOf('/') + 1);
          if (lastSegment) filename = decodeURIComponent(lastSegment);
        } catch { /* use default */ }
        if (!filename.includes('.')) {
            const extension = blob.type.split('/')[1] || 'png';
            filename = `${filename}.${extension}`;
        }
        return new File([blob], filename, { type: blob.type });
      } else {
        console.warn(`Direct fetch for ${imageUrl} succeeded but returned non-image MIME type: ${blob.type}. Falling back to proxy.`);
      }
    } else {
      console.warn(`Direct fetch for ${imageUrl} failed (status: ${directResponse.status}, type: ${directResponse.type}). Falling back to proxy.`);
    }
  } catch (directFetchError: any) {
    console.warn(`Direct fetch for ${imageUrl} failed with error: ${directFetchError.message}. Falling back to proxy.`);
  }

  // Attempt 2: Fetch via CORS proxy
  console.log(`Falling back to CORS proxy for: ${imageUrl}`);
  const corsProxy = 'https://odd-dream-5e6e.anthorytsang.workers.dev/?url=';
  const proxyUrl = corsProxy + encodeURIComponent(imageUrl);
  let proxyResponse;

  try {
    proxyResponse = await fetch(proxyUrl);
  } catch (networkError: any) {
    console.error('Network error fetching image via proxy:', networkError);
    throw new Error(
      `Network error trying to fetch image through proxy. Proxy or connection might be down. (URL: ${imageUrl})`
    );
  }

  if (!proxyResponse.ok) {
    throw new Error(
      `Failed to fetch image through proxy (proxy status: ${proxyResponse.status}). Original URL: ${imageUrl}. The image URL might be invalid, the server blocked the proxy, or the proxy itself encountered an error.`
    );
  }

  if (proxyResponse.type === "opaque") {
    console.error('Received opaque response from proxy for image.');
    throw new Error(
        `Failed to load image: Received an opaque response from the proxy for ${imageUrl}. Image data cannot be accessed. This might be a proxy issue or a restriction from the image server.`
    );
  }

  const blob = await proxyResponse.blob();

  if (!blob.type || !blob.type.startsWith('image/')) {
     console.warn(`Unexpected or missing MIME type from proxy for image: ${blob.type} (URL: ${imageUrl}). The file might not be a valid image or the proxy response is corrupted.`);
     // Heuristic: if URL has common image extension, proceed with caution, otherwise fail.
     if (!/\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(imageUrl) && (!blob.type || !blob.type.startsWith('image/'))) {
        throw new Error(
            `The fetched file (from proxy for ${imageUrl}) does not appear to be an image (MIME type: ${blob.type || 'unknown'}). Please check the URL.`
        );
     }
  }
  
  let filename = defaultFileName;
  try {
    const path = new URL(imageUrl).pathname;
    const lastSegment = path.substring(path.lastIndexOf('/') + 1);
    if (lastSegment) {
      filename = decodeURIComponent(lastSegment);
    }
  } catch (e) {
    console.warn("Could not derive filename from original image URL, using default.");
  }

  const defaultExtension = (blob.type && blob.type.startsWith('image/')) ? (blob.type.split('/')[1] || 'png') : 'png';
  const extensionRegex = /\.[0-9a-z]+$/i;
  if (!extensionRegex.test(filename)) {
      filename = `${filename}.${defaultExtension}`;
  }
  
  const fileType = (blob.type && blob.type.startsWith('image/')) ? blob.type : `image/${defaultExtension}`;

  console.log(`Image fetch via proxy successful for: ${imageUrl}`);
  return new File([blob], filename, { type: fileType });
}
