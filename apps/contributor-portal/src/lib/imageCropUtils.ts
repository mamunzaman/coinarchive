export type CropArea = {
  x: number
  y: number
  width: number
  height: number
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180
}

function rotateSize(width: number, height: number, rotation: number) {
  const radians = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

export async function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  mimeType = 'image/jpeg',
): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Crop failed.'))
          return
        }
        resolve(result)
      },
      mimeType,
      0.92,
    )
  })

  return new File([blob], fileName, { type: mimeType })
}

export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
  fileName = 'cropped-image.jpg',
  mimeType = 'image/jpeg',
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is not supported.')
  }

  const rotRad = getRadianAngle(rotation)
  const { width: boxWidth, height: boxHeight } = rotateSize(image.width, image.height, rotation)

  canvas.width = boxWidth
  canvas.height = boxHeight

  context.translate(boxWidth / 2, boxHeight / 2)
  context.rotate(rotRad)
  context.translate(-image.width / 2, -image.height / 2)
  context.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedContext = croppedCanvas.getContext('2d')

  if (!croppedContext) {
    throw new Error('Canvas is not supported.')
  }

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedContext.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Crop failed.'))
          return
        }
        resolve(result)
      },
      mimeType,
      0.92,
    )
  })

  return new File([blob], fileName, { type: mimeType })
}

export function getOutputMimeType(file: File): string {
  if (file.type === 'image/png') {
    return 'image/png'
  }

  if (file.type === 'image/webp') {
    return 'image/webp'
  }

  return 'image/jpeg'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function getCroppedImagePreviewUrl(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation = 0,
  mimeType = 'image/jpeg',
): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is not supported.')
  }

  const rotRad = getRadianAngle(rotation)
  const { width: boxWidth, height: boxHeight } = rotateSize(image.width, image.height, rotation)

  canvas.width = boxWidth
  canvas.height = boxHeight

  context.translate(boxWidth / 2, boxHeight / 2)
  context.rotate(rotRad)
  context.translate(-image.width / 2, -image.height / 2)
  context.drawImage(image, 0, 0)

  const croppedCanvas = document.createElement('canvas')
  const croppedContext = croppedCanvas.getContext('2d')

  if (!croppedContext) {
    throw new Error('Canvas is not supported.')
  }

  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  croppedContext.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  const blob = await new Promise<Blob>((resolve, reject) => {
    croppedCanvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('Preview failed.'))
          return
        }
        resolve(result)
      },
      mimeType,
      0.85,
    )
  })

  return URL.createObjectURL(blob)
}
