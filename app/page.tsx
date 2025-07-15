"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Download, Settings, FileText } from "lucide-react"
import Image from "next/image"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface Specification {
  id: string
  key: string
  value: string
}

interface PriceTagData {
  productName: string
  specifications: Specification[]
  currentPrice: string
  originalPrice: string
  hasDiscount: boolean
  currency: string
}

interface PDFSettings {
  format: "a4" | "a5" | "letter"
  orientation: "portrait" | "landscape"
  quality: "low" | "medium" | "high"
  includeTimestamp: boolean
  includeBorder: boolean
  multipleCopies: number
}

export default function PriceTagEditor() {
  const [data, setData] = useState<PriceTagData>({
    productName: "Название и модель товара",
    specifications: [
      { id: "1", key: "Характеристики", value: "1" },
      { id: "2", key: "Характеристики", value: "2" },
      { id: "3", key: "Характеристики", value: "3" },
      { id: "4", key: "Характеристики", value: "4" },
    ],
    currentPrice: "900000",
    originalPrice: "1000000",
    hasDiscount: true,
    currency: "тенге/шт",
  })

  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    format: "a4",
    orientation: "landscape", // альбомная по умолчанию
    quality: "high", // всегда высокое
    includeTimestamp: false, // не используется
    includeBorder: false, // не используется
    multipleCopies: 1,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "image">("pdf")
  const [isExportMode, setIsExportMode] = useState(false) // Новое состояние для режима экспорта

  const addSpecification = () => {
    setData((prev) => {
      if (prev.specifications.length >= 4) return prev;
      const newSpec = {
        id: Date.now().toString(),
        key: "",
        value: "",
      };
      return {
        ...prev,
        specifications: [...prev.specifications, newSpec],
      };
    });
  };

  const removeSpecification = (id: string) => {
    setData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((spec) => spec.id !== id),
    }))
  }

  const updateSpecification = (id: string, field: "key" | "value", value: string) => {
    setData((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec) => (spec.id === id ? { ...spec, [field]: value } : spec)),
    }))
  }

  const formatPrice = (price: string) => {
    if (!price) return ""
    const numPrice = Number.parseFloat(price.replace(/[^\d.]/g, ""))
    if (isNaN(numPrice)) return price
    return numPrice.toLocaleString("ru-RU")
  }

  const getQualitySettings = (quality: string) => {
    switch (quality) {
      case "low":
        return { scale: 1, quality: 0.8 }
      case "medium":
        return { scale: 1.5, quality: 0.9 }
      case "high":
        return { scale: 2, quality: 1.0 }
      default:
        return { scale: 2, quality: 1.0 }
    }
  }

  const getPageDimensions = (format: string, orientation: string) => {
    const dimensions = {
      a4: { width: 210, height: 297 },
      a5: { width: 148, height: 210 },
      letter: { width: 216, height: 279 },
    }
    
    const dim = dimensions[format as keyof typeof dimensions] || dimensions.a4
    
    if (orientation === "landscape") {
      return { width: dim.height, height: dim.width }
    }
    
    return dim
  }

  const generatePDF = async () => {
    const element = document.getElementById("price-tag-preview")
    if (!element) return

    setIsGenerating(true)
    setIsExportMode(true) // Включаем режим экспорта

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const qualitySettings = getQualitySettings(pdfSettings.quality)
      const pageDimensions = getPageDimensions(pdfSettings.format, pdfSettings.orientation)

      // Генерируем canvas без отступов, на всю страницу
      const canvas = await html2canvas(element, {
        scale: qualitySettings.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: element.offsetWidth,
        height: element.offsetHeight,
        imageTimeout: 15000,
        logging: false,
      })

      const pdf = new jsPDF(pdfSettings.orientation, "mm", pdfSettings.format)
      const pdfWidth = pageDimensions.width
      const pdfHeight = pageDimensions.height
      const imgData = canvas.toDataURL("image/png", qualitySettings.quality)

      // Новая логика: вставляем картинку строго с (0,0) и на всю ширину/высоту
      const copiesPerRow = pdfSettings.orientation === "landscape" ? 2 : 1
      const copiesPerCol = Math.ceil(pdfSettings.multipleCopies / copiesPerRow)
      const canvasAspectRatio = canvas.width / canvas.height
      const availableWidth = pdfWidth / copiesPerRow
      const availableHeight = pdfHeight / copiesPerCol
      let targetWidth = availableWidth
      let targetHeight = targetWidth / canvasAspectRatio
      if (targetHeight > availableHeight) {
        targetHeight = availableHeight
        targetWidth = targetHeight * canvasAspectRatio
      }
      for (let copy = 0; copy < pdfSettings.multipleCopies; copy++) {
        const row = Math.floor(copy / copiesPerRow)
        const col = copy % copiesPerRow
        const x = col * availableWidth
        const y = row * availableHeight
        pdf.addImage(imgData, "PNG", x, y, targetWidth, targetHeight)
      }

      // Add border if enabled
      if (pdfSettings.includeBorder) {
      pdf.setDrawColor(200, 200, 200)
        pdf.setLineWidth(0.2)
        pdf.rect(2, 2, pdfWidth - 4, pdfHeight - 4)
      }

      // Add timestamp if enabled
      if (pdfSettings.includeTimestamp) {
      pdf.setFontSize(8)
      pdf.setTextColor(128, 128, 128)
        const timestamp = new Date().toLocaleString("ru-RU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
        pdf.text(`Создано: ${timestamp}`, 5, pdfHeight - 3)
      }

      // Add page number if multiple pages
      if (pdfSettings.multipleCopies > 4) {
        pdf.setFontSize(10)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`Страница 1`, pdfWidth - 25, pdfHeight - 5)
      }

      // Generate filename with more details
      const date = new Date().toISOString().split("T")[0]
      const time = new Date().toLocaleTimeString("ru-RU", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }).replace(":", "-")
      const productName = data.productName
        .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "")
        .substring(0, 25)
        .trim()
      const copiesText = pdfSettings.multipleCopies > 1 ? `_${pdfSettings.multipleCopies}шт` : ""
      const filename = `ценник_${productName}_${date}_${time}${copiesText}.pdf`

      // Download the PDF
      pdf.save(filename)

      console.log("PDF успешно создан:", filename)
    } catch (error) {
      console.error("Ошибка при создании PDF:", error)
      alert("Произошла ошибка при создании PDF файла. Попробуйте еще раз.")
    } finally {
      setIsGenerating(false)
      setIsExportMode(false) // Выключаем режим экспорта
    }
  }

  const generateImage = async () => {
    const element = document.getElementById("price-tag-preview")
    if (!element) return

    setIsGenerating(true)
    setIsExportMode(true) // Включаем режим экспорта

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const qualitySettings = getQualitySettings(pdfSettings.quality)
      
      const canvas = await html2canvas(element, {
        scale: qualitySettings.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        width: element.offsetWidth,
        height: element.offsetHeight,
        imageTimeout: 15000,
        logging: false,
      })

      // Create download link
      const link = document.createElement("a")
      const date = new Date().toISOString().split("T")[0]
      const time = new Date().toLocaleTimeString("ru-RU", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }).replace(":", "-")
      const productName = data.productName
        .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "")
        .substring(0, 25)
        .trim()
      
      link.download = `ценник_${productName}_${date}_${time}.png`
      link.href = canvas.toDataURL("image/png", qualitySettings.quality)
      link.click()

      console.log("Изображение успешно создано")
    } catch (error) {
      console.error("Ошибка при создании изображения:", error)
      alert("Произошла ошибка при создании изображения. Попробуйте еще раз.")
    } finally {
      setIsGenerating(false)
      setIsExportMode(false) // Выключаем режим экспорта
    }
  }

  const handleExport = () => {
    if (exportFormat === "pdf") {
      generatePDF()
    } else {
      generateImage()
    }
  }

  const getPDFInfo = () => {
    const pageDimensions = getPageDimensions(pdfSettings.format, pdfSettings.orientation)
    const copiesPerRow = pdfSettings.orientation === "landscape" ? 2 : 1
    const copiesPerCol = Math.ceil(pdfSettings.multipleCopies / copiesPerRow)
    
    return {
      format: pdfSettings.format.toUpperCase(),
      orientation: pdfSettings.orientation === "portrait" ? "Книжная" : "Альбомная",
      quality: pdfSettings.quality === "high" ? "Высокое" : pdfSettings.quality === "medium" ? "Среднее" : "Низкое",
      copies: pdfSettings.multipleCopies,
      copiesPerRow,
      copiesPerCol,
      pageWidth: pageDimensions.width,
      pageHeight: pageDimensions.height,
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Редактор ценников</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Информация о товаре */}
          <Card>
            <CardHeader>
              <CardTitle>Информация о товаре</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="productName">Название товара</Label>
                <Input
                  id="productName"
                  value={data.productName}
                  onChange={(e) => setData((prev) => ({ ...prev, productName: e.target.value }))}
                  placeholder="Введите название товара"
                />
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Характеристики</Label>
                  <Button onClick={addSpecification} size="sm" variant="outline" disabled={data.specifications.length >= 4}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                {data.specifications.map((spec, index) => (
                  <div key={spec.id} className="flex gap-2 items-center">
                    <Input
                      placeholder="Свойство"
                      value={spec.key}
                      onChange={(e) => updateSpecification(spec.id, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Значение"
                      value={spec.value}
                      onChange={(e) => updateSpecification(spec.id, "value", e.target.value)}
                      className="flex-1"
                    />
                    {data.specifications.length > 1 && (
                      <Button onClick={() => removeSpecification(spec.id)} size="sm" variant="outline" className="px-2">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="discount"
                    checked={data.hasDiscount}
                    onCheckedChange={(checked) => setData((prev) => ({ ...prev, hasDiscount: checked }))}
                  />
                  <Label htmlFor="discount">Включить скидку</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPrice">{data.hasDiscount ? "Цена со скидкой" : "Цена"}</Label>
                    <Input
                      id="currentPrice"
                      value={data.currentPrice}
                      onChange={(e) => setData((prev) => ({ ...prev, currentPrice: e.target.value }))}
                      placeholder="0"
                      type="number"
                    />
                  </div>

                  {data.hasDiscount && (
                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Первоначальная цена</Label>
                      <Input
                        id="originalPrice"
                        value={data.originalPrice}
                        onChange={(e) => setData((prev) => ({ ...prev, originalPrice: e.target.value }))}
                        placeholder="0"
                        type="number"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Валюта</Label>
                  <Input
                    id="currency"
                    value={data.currency}
                    onChange={(e) => setData((prev) => ({ ...prev, currency: e.target.value }))}
                    placeholder="тенге/шт"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Предварительный просмотр */}
          <Card>
            <CardHeader>
              <CardTitle>Предварительный просмотр</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                id="price-tag-preview"
                className="bg-white overflow-visible mx-auto relative"
                style={{ width: "297px", height: "420px", minHeight: "420px" }}
              >
                {/* Header */}
                <div className="flex bg-white">
                  {/* Yellow left block */}
                  <div className="bg-[rgba(255,195,1,1)] h-24 w-4 leading-7 tracking-normal text-left mt-0 mb-0 pt-0 border-t-8 border-transparent border-none pl-0 ml-0 rounded-none"></div>

                  {/* Logo section */}
                  <div className="p-4 flex bg-white flex-row justify-start flex-1">
                    <Image
                      src="/images/logo_pospro_new.png"
                      alt="POSPRO Logo"
                      width={180}
                      height={90}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Product name block - fixed width */}
                {data.productName && (
                  <div className="flex justify-end pb-2">
                    <div className="w-64 px-4 bg-[rgba(255,195,1,1)] text-right rounded-l-md" style={{ height: '32px', display: 'table' }}>
                      <div className={`font-bold text-right truncate pr-0 ${isExportMode ? 'export-product-name-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1' }}>{data.productName}</div>
                    </div>
                  </div>
                )}

                {/* Specifications */}
                {data.specifications.some((spec) => spec.key && spec.value) && (
                  <div className={`p-4 ${isExportMode ? 'export-specifications-shift' : ''}`}>
                    <div className="font-bold mb-2">Основные характеристики:</div>
                    <div className="space-y-1 text-sm">
                      {data.specifications
                        .filter((spec) => spec.key && spec.value)
                        .map((spec) => (
                          <div key={spec.id}>
                            {spec.key}: {spec.value}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Price Section */}
                <div className="p-4 flex items-end justify-end py-4 px-0 pt-0 pb-0 border-b-0 gap-x-0">
                  <div className="text-right">
                    {data.hasDiscount && data.originalPrice ? (
                      <div className="flex flex-col items-end space-y-2">
                        <div className="px-3 border-0 rounded-l-lg bg-[rgba(255,195,1,1)]" style={{ height: '40px', display: 'table' }}>
                          <div className={`text-right ${isExportMode ? 'export-current-price-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1' }}>
                            <span className="text-2xl font-bold">{formatPrice(data.currentPrice)}</span>
                            <span className="text-xs ml-1">{data.currency}</span>
                          </div>
                        </div>
                        <div className="border-gray-400 px-2 rounded-l-lg opacity-100 border text-base border-l pl-3" style={{ height: '28px', display: 'table' }}>
                          <div className={`text-right ${isExportMode ? 'export-original-price-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1', position: 'relative' }}>
                            <span style={{ position: 'relative' }}>{formatPrice(data.originalPrice)}</span>
                            <span className="text-xs ml-1">{data.currency}</span>
                            <div className={`${isExportMode ? 'export-strikethrough-line-shift' : ''}`} style={{ 
                              position: 'absolute', 
                              top: '50%', 
                              left: '0', 
                              right: '0', 
                              height: '1px', 
                              backgroundColor: 'black', 
                              zIndex: 2 
                            }}></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      data.currentPrice && (
                        <div className="px-3 border-0 rounded-l-lg bg-[rgba(255,195,1,1)]" style={{ height: '40px', display: 'table' }}>
                          <div className={`text-right ${isExportMode ? 'export-current-price-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1' }}>
                            <span className="text-2xl font-bold">{formatPrice(data.currentPrice)}</span>
                            <span className="text-xs ml-1">{data.currency}</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
                {/* Logo at bottom */}
                <div className="absolute bottom-2 left-2">
                  <Image
                    src="/images/logo_arrow_new.png"
                    alt="Arrow Logo"
                    width={60}
                    height={60}
                    className="object-contain"
                  />
                </div>
              </div>
            </CardContent>
            <div className="mt-auto p-4 border-t flex justify-center">
              <Button 
                className="px-6 py-2 text-base"
                style={{ width: 'auto', minWidth: 'unset' }}
                onClick={handleExport}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Создание {exportFormat === "pdf" ? "PDF" : "изображения"}...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать {exportFormat === "pdf" ? "PDF" : "PNG"}
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Настройки */}
          <Card>
            <CardHeader>
              <CardTitle>Настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="format">Формат</Label>
                  <Select
                    value={pdfSettings.format}
                    onValueChange={(value) => setPdfSettings(prev => ({ ...prev, format: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a4">A4</SelectItem>
                      <SelectItem value="a5">A5</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orientation">Ориентация</Label>
                  <Select
                    value={pdfSettings.orientation}
                    onValueChange={(value) => setPdfSettings(prev => ({ ...prev, orientation: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Альбомная</SelectItem>
                      <SelectItem value="portrait">Книжная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="copies">Количество копий</Label>
                  <Input
                    type="number"
                    min="1"
                    max="2"
                    value={pdfSettings.multipleCopies}
                    onChange={(e) => setPdfSettings(prev => ({ ...prev, multipleCopies: Math.max(1, Math.min(2, parseInt(e.target.value) || 1)) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exportFormat">Формат экспорта</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(value) => setExportFormat(value as "pdf" | "image")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF документ</SelectItem>
                      <SelectItem value="image">PNG изображение</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* PDF Info Preview внизу карточки */}
              <div className="bg-gray-50 p-3 rounded-lg mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4" />
                  <Label className="font-medium text-sm">Настройки PDF</Label>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Формат: {getPDFInfo().format}</div>
                  <div>Ориентация: {getPDFInfo().orientation}</div>
                  <div>Качество: {getPDFInfo().quality}</div>
                  <div>Копий: {getPDFInfo().copies}</div>
                  <div>Расположение: {getPDFInfo().copiesPerRow}×{getPDFInfo().copiesPerCol}</div>
                  <div>Размер страницы: {getPDFInfo().pageWidth}×{getPDFInfo().pageHeight} мм</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
