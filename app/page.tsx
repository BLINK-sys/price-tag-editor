"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Download, Settings, FileText, X, Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { loadLogoConfig, saveLogoConfig, defaultLogoConfig, LogoConfig } from "@/lib/config"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

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
  orientation: "portrait" | "landscape"
  includeTimestamp: boolean
  includeBorder: boolean
}

interface LogoSettings {
  size: number
  verticalPosition: number
}

export default function PriceTagEditor() {
  // Состояние для количества товаров
  const [productCount, setProductCount] = useState(1)
  const [activeTab, setActiveTab] = useState(0)

  // Массив данных для каждого товара
  const [productsData, setProductsData] = useState<PriceTagData[]>([
    {
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
    }
  ])

  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    orientation: "landscape",
    includeTimestamp: false,
    includeBorder: false,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "image">("pdf")
  const [isExportMode, setIsExportMode] = useState(false)
  
  // Состояние для настроек логотипа
  const [logoSettings, setLogoSettings] = useState<LogoSettings>({ size: 180, verticalPosition: 0 })
  const [showLogoSettings, setShowLogoSettings] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [showSaveConfirmDialog, setShowSaveConfirmDialog] = useState(false)
  
  // Состояние для размера шрифта наименования товара
  const [productNameFontSize, setProductNameFontSize] = useState(16)
  
  // Состояние для размера шрифта характеристик
  const [specificationsFontSize, setSpecificationsFontSize] = useState(14)

  // Загружаем сохраненные настройки только на клиенте
  useEffect(() => {
    setIsClient(true)
    const loadSettings = async () => {
      try {
        const settings = await loadLogoConfig()
        setLogoSettings(settings)
      } catch (error) {
        console.error('Ошибка загрузки настроек логотипа:', error)
      }
    }
    loadSettings()
  }, [])

  // Функция для показа диалога подтверждения сохранения
  const handleSaveClick = () => {
    setShowSaveConfirmDialog(true)
  }

  // Функция для сохранения настроек логотипа
  const saveLogoSettings = async () => {
    try {
      await saveLogoConfig(logoSettings)
      setShowSaveConfirmDialog(false)
      // Убираем alert, так как у нас есть красивое модальное окно
    } catch (e) {
      console.error('Ошибка сохранения настроек логотипа:', e)
      alert('Ошибка сохранения настроек!')
    }
  }

  // Функция для обновления количества товаров
  const updateProductCount = (count: number) => {
    // Ограничиваем максимум 2 товарами
    const limitedCount = Math.min(count, 2)
    setProductCount(limitedCount)
    
    if (limitedCount > productsData.length) {
      // Добавляем новые товары
      const newProducts = Array.from({ length: limitedCount - productsData.length }, (_, index) => ({
        productName: `Товар ${productsData.length + index + 1}`,
        specifications: [
          { id: `${Date.now() + index}_1`, key: "Характеристики", value: "1" },
          { id: `${Date.now() + index}_2`, key: "Характеристики", value: "2" },
          { id: `${Date.now() + index}_3`, key: "Характеристики", value: "3" },
          { id: `${Date.now() + index}_4`, key: "Характеристики", value: "4" },
        ],
        currentPrice: "900000",
        originalPrice: "1000000",
        hasDiscount: true,
        currency: "тенге/шт",
      }))
      setProductsData([...productsData, ...newProducts])
    } else if (limitedCount < productsData.length) {
      // Удаляем лишние товары
      setProductsData(productsData.slice(0, limitedCount))
      if (activeTab >= limitedCount) {
        setActiveTab(limitedCount - 1)
      }
    }
  }

  // Функция для проверки, нужно ли показывать селектор количества товаров
  const shouldShowProductCountSelector = () => {
    // Показываем только для PDF альбомной ориентации
    return exportFormat === "pdf" && pdfSettings.orientation === "landscape"
  }

  // Функция для автоматического сброса на 1 товар при несовместимых настройках
  const handleExportFormatChange = (value: "pdf" | "image") => {
    setExportFormat(value)
    if (value === "image" && productCount > 1) {
      setProductCount(1)
      setActiveTab(0)
    }
  }

  const handleOrientationChange = (value: "portrait" | "landscape") => {
    setPdfSettings(prev => ({ ...prev, orientation: value }))
    if (value === "portrait" && productCount > 1) {
      setProductCount(1)
      setActiveTab(0)
    }
  }

  // Функции для работы с текущим активным товаром
  const getCurrentProduct = () => productsData[activeTab]
  const setCurrentProduct = (updater: (prev: PriceTagData) => PriceTagData) => {
    setProductsData(prev => prev.map((product, index) => 
      index === activeTab ? updater(product) : product
    ))
  }

  // Автоматическое обновление размера шрифта при изменении наименования товара
  useEffect(() => {
    if (isClient) {
      const currentProduct = getCurrentProduct()
      const newFontSize = adjustProductNameFontSize(currentProduct.productName)
      setProductNameFontSize(newFontSize)
    }
  }, [getCurrentProduct().productName, isClient])

  // Автоматическое обновление размера шрифта при изменении характеристик
  useEffect(() => {
    if (isClient) {
      const currentProduct = getCurrentProduct()
      const newFontSize = adjustSpecificationsFontSize(currentProduct.specifications)
      setSpecificationsFontSize(newFontSize)
    }
  }, [getCurrentProduct().specifications, isClient])

  // Обновление размеров шрифтов при переключении между товарами
  useEffect(() => {
    if (isClient) {
      const currentProduct = getCurrentProduct()
      const newProductNameFontSize = adjustProductNameFontSize(currentProduct.productName)
      const newSpecsFontSize = adjustSpecificationsFontSize(currentProduct.specifications)
      setProductNameFontSize(newProductNameFontSize)
      setSpecificationsFontSize(newSpecsFontSize)
    }
  }, [activeTab, isClient])

  const addSpecification = () => {
    setCurrentProduct((prev) => {
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
    setCurrentProduct((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((spec) => spec.id !== id),
    }))
  }

  const updateSpecification = (id: string, field: "key" | "value", value: string) => {
    setCurrentProduct((prev) => ({
      ...prev,
      specifications: prev.specifications.map((spec) => 
        spec.id === id ? { ...spec, [field]: value } : spec
      ),
    }))
  }

  const formatPrice = (price: string) => {
    if (!price) return ""
    const numPrice = Number.parseFloat(price.replace(/[^\d.]/g, ""))
    if (isNaN(numPrice)) return price
    return numPrice.toLocaleString("ru-RU")
  }

  // Функция для автоматического подстраивания размера шрифта наименования товара
  const adjustProductNameFontSize = (text: string, containerWidth: number = 256) => {
    if (!text || !isClient) return 16
    
    // Создаем временный элемент для измерения текста
    const tempElement = document.createElement('div')
    tempElement.style.position = 'absolute'
    tempElement.style.visibility = 'hidden'
    tempElement.style.whiteSpace = 'nowrap'
    tempElement.style.fontWeight = 'bold'
    tempElement.style.fontFamily = 'Arial, Helvetica, sans-serif'
    tempElement.textContent = text
    
    document.body.appendChild(tempElement)
    
    let fontSize = 16
    const maxFontSize = 24
    const minFontSize = 8
    const padding = 32 // Учитываем padding контейнера (px-4 = 16px с каждой стороны)
    const availableWidth = containerWidth - padding
    
    // Начинаем с максимального размера и уменьшаем, пока текст не поместится
    for (let size = maxFontSize; size >= minFontSize; size--) {
      tempElement.style.fontSize = `${size}px`
      const textWidth = tempElement.offsetWidth
      
      if (textWidth <= availableWidth) {
        fontSize = size
        break
      }
    }
    
    document.body.removeChild(tempElement)
    return fontSize
  }

  // Функция для автоматического подстраивания размера шрифта характеристик
  const adjustSpecificationsFontSize = (specifications: Specification[], containerWidth: number = 297) => {
    if (!specifications.length || !isClient) return 14
    
    // Создаем временный элемент для измерения текста
    const tempElement = document.createElement('div')
    tempElement.style.position = 'absolute'
    tempElement.style.visibility = 'hidden'
    tempElement.style.whiteSpace = 'nowrap'
    tempElement.style.fontFamily = 'Arial, Helvetica, sans-serif'
    tempElement.style.fontSize = '14px'
    
    document.body.appendChild(tempElement)
    
    let fontSize = 14
    const maxFontSize = 14
    const minFontSize = 8
    const padding = 32 // Учитываем padding контейнера (p-4 = 16px с каждой стороны)
    const availableWidth = containerWidth - padding
    
    // Начинаем с максимального размера и уменьшаем, пока все строки характеристик поместятся
    for (let size = maxFontSize; size >= minFontSize; size--) {
      tempElement.style.fontSize = `${size}px`
      let maxTextWidth = 0
      
      // Проверяем все строки характеристик
      for (const spec of specifications) {
        if (spec.key && spec.value) {
          const text = `${spec.key}: ${spec.value}`
          tempElement.textContent = text
          const textWidth = tempElement.offsetWidth
          maxTextWidth = Math.max(maxTextWidth, textWidth)
        }
      }
      
      if (maxTextWidth <= availableWidth) {
        fontSize = size
        break
      }
    }
    
    document.body.removeChild(tempElement)
    return fontSize
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
    setIsGenerating(true)
    setIsExportMode(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Обновляем размер шрифта для всех товаров перед генерацией
      for (let i = 0; i < productCount; i++) {
        const product = productsData[i]
        const productNameFontSize = adjustProductNameFontSize(product.productName)
        const specsFontSize = adjustSpecificationsFontSize(product.specifications)
        if (i === activeTab) {
          setProductNameFontSize(productNameFontSize)
          setSpecificationsFontSize(specsFontSize)
        }
      }

      const qualitySettings = getQualitySettings("high")
      const pageDimensions = getPageDimensions("a4", pdfSettings.orientation)
      const pdf = new jsPDF(pdfSettings.orientation, "mm", "a4")
      const pdfWidth = pageDimensions.width
      const pdfHeight = pageDimensions.height

      // Определяем количество товаров в ряду и колонке
      // Только для A4 альбомной ориентации размещаем 2 товара
      const copiesPerRow = (pdfSettings.orientation === "landscape" && productCount === 2) ? 2 : 1
      const copiesPerCol = Math.ceil(productCount / copiesPerRow)
      const availableWidth = pdfWidth / copiesPerRow
      const availableHeight = pdfHeight / copiesPerCol

      // Генерируем PDF для каждого товара
      for (let i = 0; i < productCount; i++) {
        const row = Math.floor(i / copiesPerRow)
        const col = i % copiesPerRow
        const x = col * availableWidth
        const y = row * availableHeight

        // Временно устанавливаем активный товар для рендеринга
        setActiveTab(i)
        await new Promise((resolve) => setTimeout(resolve, 50));

        const element = document.getElementById("price-tag-preview")
        if (!element) continue

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

      const imgData = canvas.toDataURL("image/png", qualitySettings.quality)
      const canvasAspectRatio = canvas.width / canvas.height
        
      let targetWidth = availableWidth
      let targetHeight = targetWidth / canvasAspectRatio
      if (targetHeight > availableHeight) {
        targetHeight = availableHeight
        targetWidth = targetHeight * canvasAspectRatio
      }

        pdf.addImage(imgData, "PNG", x, y, targetWidth, targetHeight)
      }

      // Восстанавливаем активную вкладку
      setActiveTab(0)

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

      // Generate filename
      const date = new Date().toISOString().split("T")[0]
      const time = new Date().toLocaleTimeString("ru-RU", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }).replace(":", "-")
      const productName = productsData[0].productName
        .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "")
        .substring(0, 25)
        .trim()
      const copiesText = productCount > 1 ? `_${productCount}шт` : ""
      const filename = `ценник_${productName}_${date}_${time}${copiesText}.pdf`

      pdf.save(filename)
      console.log("PDF успешно создан:", filename)
    } catch (error) {
      console.error("Ошибка при создании PDF:", error)
      alert("Произошла ошибка при создании PDF файла. Попробуйте еще раз.")
    } finally {
      setIsGenerating(false)
      setIsExportMode(false)
    }
  }

  const generateImage = async () => {
    // PNG экспорт только для одного товара
    if (productCount > 1) {
      alert("PNG экспорт доступен только для одного товара. Выберите 1 товар или используйте PDF формат.")
      return
    }

    setIsGenerating(true)
    setIsExportMode(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Обновляем размер шрифта перед генерацией изображения
      const currentProduct = getCurrentProduct()
      const productNameFontSize = adjustProductNameFontSize(currentProduct.productName)
      const specsFontSize = adjustSpecificationsFontSize(currentProduct.specifications)
      setProductNameFontSize(productNameFontSize)
      setSpecificationsFontSize(specsFontSize)

      const qualitySettings = getQualitySettings("high")
      
      const element = document.getElementById("price-tag-preview")
      if (!element) return
      
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

      const link = document.createElement("a")
      const date = new Date().toISOString().split("T")[0]
      const time = new Date().toLocaleTimeString("ru-RU", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }).replace(":", "-")
      const productName = getCurrentProduct().productName
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
      setIsExportMode(false)
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
    const pageDimensions = getPageDimensions("a4", pdfSettings.orientation)
    // Только для A4 альбомной ориентации размещаем 2 товара
    const copiesPerRow = (pdfSettings.orientation === "landscape" && productCount === 2) ? 2 : 1
    const copiesPerCol = Math.ceil(productCount / copiesPerRow)
    
    return {
      format: "A4",
      orientation: pdfSettings.orientation === "portrait" ? "Книжная" : "Альбомная",
      quality: "Высокое",
      copies: productCount,
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

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Информация о товаре */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Информация о товаре</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 flex flex-col">
              {/* Селектор количества товаров */}
              {shouldShowProductCountSelector() && (
                <div className="space-y-2">
                  <Label htmlFor="productCount">Количество товаров</Label>
                  <Select
                    value={productCount.toString()}
                    onValueChange={(value) => updateProductCount(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 товар</SelectItem>
                      <SelectItem value="2">2 товара</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Вкладки товаров */}
              {productCount > 1 && (
                <div className="space-y-2">
                  <Label>Выберите товар для редактирования:</Label>
                  <div className="flex flex-wrap gap-2">
                    {productsData.slice(0, 2).map((product, index) => (
                      <Button
                        key={index}
                        variant={activeTab === index ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveTab(index)}
                        className="flex items-center gap-2"
                      >
                        Товар {index + 1}
                        {activeTab === index && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Name */}
              <div className="space-y-2">
                <Label htmlFor="productName">Название товара {productCount > 1 ? `(${activeTab + 1})` : ''}</Label>
                <Input
                  id="productName"
                  value={getCurrentProduct().productName}
                  onChange={(e) => setCurrentProduct((prev) => ({ ...prev, productName: e.target.value }))}
                  placeholder="Введите название товара"
                />
              </div>

              {/* Specifications */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Характеристики</Label>
                  <Button onClick={addSpecification} size="sm" variant="outline" disabled={getCurrentProduct().specifications.length >= 4}>
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                {getCurrentProduct().specifications.map((spec, index) => (
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
                    {getCurrentProduct().specifications.length > 1 && (
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
                    checked={getCurrentProduct().hasDiscount}
                    onCheckedChange={(checked) => setCurrentProduct((prev) => ({ ...prev, hasDiscount: checked }))}
                  />
                  <Label htmlFor="discount">Включить скидку</Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPrice">{getCurrentProduct().hasDiscount ? "Цена со скидкой" : "Цена"}</Label>
                    <Input
                      id="currentPrice"
                      value={getCurrentProduct().currentPrice}
                      onChange={(e) => setCurrentProduct((prev) => ({ ...prev, currentPrice: e.target.value }))}
                      placeholder="0"
                      type="number"
                    />
                  </div>

                  {getCurrentProduct().hasDiscount && (
                    <div className="space-y-2">
                      <Label htmlFor="originalPrice">Первоначальная цена</Label>
                      <Input
                        id="originalPrice"
                        value={getCurrentProduct().originalPrice}
                        onChange={(e) => setCurrentProduct((prev) => ({ ...prev, originalPrice: e.target.value }))}
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
                    value={getCurrentProduct().currency}
                    onChange={(e) => setCurrentProduct((prev) => ({ ...prev, currency: e.target.value }))}
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
            <CardContent className="space-y-4">
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
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setShowLogoSettings(!showLogoSettings)}
                      title="Нажмите для настройки размера логотипа"
                      style={{ 
                        transform: isClient ? `translateY(${logoSettings.verticalPosition}px)` : 'translateY(0px)',
                        transition: 'transform 0.2s ease'
                      }}
                    >
                    <Image
                      src="/images/logo_pospro_new.png"
                      alt="POSPRO Logo"
                        width={isClient ? logoSettings.size : 180}
                        height={isClient ? logoSettings.size * 0.5 : 90}
                      className="object-contain"
                    />
                    </div>
                  </div>
                </div>

                {/* Product name block - fixed width */}
                {getCurrentProduct().productName && (
                  <div className="flex justify-end pb-2">
                    <div className="w-64 px-4 bg-[rgba(255,195,1,1)] text-right rounded-l-md" style={{ height: '32px', display: 'table' }}>
                      <div 
                        className={`font-bold text-right truncate pr-0 ${isExportMode ? 'export-product-name-shift' : ''}`} 
                        style={{ 
                          display: 'table-cell', 
                          verticalAlign: 'middle', 
                          lineHeight: '1',
                          fontSize: `${productNameFontSize}px`
                        }}
                      >
                        {getCurrentProduct().productName}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specifications */}
                {getCurrentProduct().specifications.some((spec) => spec.key && spec.value) && (
                  <div className={`p-4 ${isExportMode ? 'export-specifications-shift' : ''}`}>
                    <div className="font-bold mb-2">Основные характеристики:</div>
                    <div className="space-y-1" style={{ fontSize: `${specificationsFontSize}px` }}>
                      {getCurrentProduct().specifications
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
                    {getCurrentProduct().hasDiscount && getCurrentProduct().originalPrice ? (
                      <div className="flex flex-col items-end space-y-2">
                        <div className="px-3 border-0 rounded-l-lg bg-[rgba(255,195,1,1)]" style={{ height: '40px', display: 'table' }}>
                          <div className={`text-right ${isExportMode ? 'export-current-price-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1' }}>
                            <span className="text-2xl font-bold">{formatPrice(getCurrentProduct().currentPrice)}</span>
                            <span className="text-xs ml-1">{getCurrentProduct().currency}</span>
                          </div>
                        </div>
                        <div className="border-gray-400 px-2 rounded-l-lg opacity-100 border text-base border-l pl-3" style={{ height: '28px', display: 'table' }}>
                          <div className={`text-right ${isExportMode ? 'export-original-price-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1', position: 'relative' }}>
                            <span style={{ position: 'relative' }}>{formatPrice(getCurrentProduct().originalPrice)}</span>
                            <span className="text-xs ml-1">{getCurrentProduct().currency}</span>
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
                      getCurrentProduct().currentPrice && (
                        <div className="px-3 border-0 rounded-l-lg bg-[rgba(255,195,1,1)]" style={{ height: '40px', display: 'table' }}>
                          <div className={`text-right ${isExportMode ? 'export-current-price-shift' : ''}`} style={{ display: 'table-cell', verticalAlign: 'middle', lineHeight: '1' }}>
                            <span className="text-2xl font-bold">{formatPrice(getCurrentProduct().currentPrice)}</span>
                            <span className="text-xs ml-1">{getCurrentProduct().currency}</span>
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

              {/* Кнопка скачивания внутри карточки */}
              <div className="flex justify-center pt-4">
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
            </CardContent>
          </Card>

          {/* Настройки */}
          <Card>
            <CardHeader>
              <CardTitle>Настройки</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orientation">Ориентация</Label>
                  <Select
                    value={pdfSettings.orientation}
                    onValueChange={(value) => handleOrientationChange(value as "portrait" | "landscape")}
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
                  <Label htmlFor="exportFormat">Формат экспорта</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(value) => handleExportFormatChange(value as "pdf" | "image")}
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

                {/* Настройки логотипа */}
                {showLogoSettings && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <Label className="font-medium">Настройки логотипа</Label>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="logoSize" className="text-sm">Размер: {isClient ? logoSettings.size : 180}px</Label>
                        <input
                          id="logoSize"
                          type="range"
                          min="50"
                          max="300"
                          value={isClient ? logoSettings.size : 180}
                          onChange={(e) => setLogoSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          disabled={!isClient}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>50px</span>
                          <span>300px</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logoPosition" className="text-sm">Положение: {isClient ? logoSettings.verticalPosition : 0}px</Label>
                        <input
                          id="logoPosition"
                          type="range"
                          min="-50"
                          max="50"
                          value={isClient ? logoSettings.verticalPosition : 0}
                          onChange={(e) => setLogoSettings(prev => ({ ...prev, verticalPosition: parseInt(e.target.value) }))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          disabled={!isClient}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>-50px</span>
                          <span>50px</span>
                </div>
              </div>
              
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setLogoSettings({ size: 180, verticalPosition: 0 })
                          }}
                          className="flex-1"
                        >
                          Сбросить
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveClick}
                          className="flex-1"
                        >
                          Сохранить
                        </Button>
                      </div>
                          </div>
                  </div>
                )}
              </div>
              
              {/* PDF Info Preview внизу карточки */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">Настройки PDF:</h3>
                <div className="space-y-2 text-sm text-blue-700">
                  <div>Формат: {getPDFInfo().format}</div>
                  <div>Ориентация: {getPDFInfo().orientation}</div>
                  <div>Качество: {getPDFInfo().quality}</div>
                  <div>Товаров: {getPDFInfo().copies}</div>
                  <div>Расположение: {getPDFInfo().copiesPerRow}×{getPDFInfo().copiesPerCol}</div>
                  <div>Размер страницы: {getPDFInfo().pageWidth}×{getPDFInfo().pageHeight} мм</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Модальное окно подтверждения сохранения */}
      <ConfirmDialog
        isOpen={showSaveConfirmDialog}
        onClose={() => setShowSaveConfirmDialog(false)}
        onConfirm={saveLogoSettings}
        title="Подтверждение сохранения"
        message="Сохранить новые размеры логотипа? (Размер будет подгружаться автоматически)"
        confirmText="Сохранить"
        cancelText="Отмена"
      />

    </div>
  )
}
