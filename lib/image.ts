// Client-side image compression for background photo uploads.
// Scales the longest edge down to maxDim and re-encodes as JPEG 85%.
// Images already within bounds pass through untouched.
export function resizeImage(file: File, maxDim: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      if (img.width <= maxDim && img.height <= maxDim) { resolve(file); return }
      const scale = maxDim / Math.max(img.width, img.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}
