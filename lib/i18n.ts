import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'es';

const translations = {
  en: {
    // Navigation
    wardrobe: 'Wardrobe',
    upload: 'Upload',
    outfits: 'Outfits',
    profile: 'Profile',
    
    // Wardrobe Screen
    myWardrobe: 'My Wardrobe',
    addClothes: 'Add Clothes',
    all: 'All',
    tops: 'Tops',
    bottoms: 'Bottoms',
    shoes: 'Shoes',
    accessories: 'Accessories',
    outerwear: 'Outerwear',
    emptyWardrobe: 'Your wardrobe is empty',
    startAdding: 'Start adding clothes to get outfit recommendations!',
    
    // Upload Screen
    addNewClothing: 'Add New Clothing',
    takePhoto: 'Take Photo',
    chooseFromGallery: 'Choose from Gallery',
    analyzing: 'Analyzing your clothing...',
    clothingDetails: 'Clothing Details',
    type: 'Type',
    color: 'Color',
    style: 'Style',
    season: 'Season',
    saveToWardrobe: 'Save to Wardrobe',
    clothingItemAdded: 'Clothing item added to your wardrobe!',
    failedToSave: 'Failed to save the clothing item. Please try again.',
    
    // Edit Clothing
    editClothingDetails: 'Edit Clothing Details',
    category: 'Category',
    enterClothingType: 'Enter clothing type (e.g., t-shirt, jeans)',
    enterDescription: 'Enter a description of this item',
    description: 'Description',
    selectCategory: 'Select Category',
    selectColor: 'Select Color',
    selectStyle: 'Select Style',
    selectSeason: 'Select Season',
    
    // Upgrade System
    upgradeRequired: 'Upgrade Required',
    youHaveReached: 'You have reached',
    items: 'items',
    upTo: 'Up to',
    unlimitedOutfits: 'Unlimited outfit recommendations',
    advancedAI: 'Advanced AI styling',
    prioritySupport: 'Priority customer support',
    everythingInPro: 'Everything in Pro',
    personalStylist: 'Personal AI stylist',
    exclusiveFeatures: 'Exclusive premium features',
    upgrade: 'Upgrade',
    upgradeToProMessage: 'Upgrade to Pro for $10 to add up to 100 clothing items',
    upgradeToPremiumMessage: 'Upgrade to Premium for $20 to add up to 500 clothing items',
    upgradeSuccessful: 'Upgrade successful! You can now add more items.',
    viewWardrobe: 'View Wardrobe',
    addMore: 'Add More',
    success: 'Success',
    
    // Outfits Screen
    outfitRecommendations: 'Outfit Recommendations',
    getRecommendations: 'Get Recommendations',
    styleQuiz: 'Style Quiz',
    question1: "What's the occasion?",
    question2: "What's the weather like?",
    question3: "What's your vibe today?",
    
    // Occasions
    casual: 'Casual',
    work: 'Work',
    party: 'Party',
    date: 'Date',
    gym: 'Gym',
    
    // Weather
    sunny: 'Sunny',
    rainy: 'Rainy',
    cold: 'Cold',
    hot: 'Hot',
    mild: 'Mild',
    
    // Vibes
    comfortable: 'Comfortable',
    elegant: 'Elegant',
    trendy: 'Trendy',
    bold: 'Bold',
    minimalist: 'Minimalist',
    
    // Outfit Results
    recommendedOutfits: 'Recommended Outfits',
    completeOutfit: 'Complete Outfit',
    missingItems: 'Missing Items',
    youNeed: 'You need:',
    characteristics: 'Characteristics:',
    
    // Profile Screen
    myProfile: 'My Profile',
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',
    wardrobeStats: 'Wardrobe Stats',
    totalItems: 'Total Items',
    outfitsCreated: 'Outfits Created',
    
    // Common
    next: 'Next',
    back: 'Back',
    done: 'Done',
    cancel: 'Cancel',
    save: 'Save',
    loading: 'Loading...',
    error: 'Error',
    tryAgain: 'Try Again',
  },
  es: {
    // Navigation
    wardrobe: 'Guardarropa',
    upload: 'Subir',
    outfits: 'Outfits',
    profile: 'Perfil',
    
    // Wardrobe Screen
    myWardrobe: 'Mi Guardarropa',
    addClothes: 'Agregar Ropa',
    all: 'Todo',
    tops: 'Blusas',
    bottoms: 'Pantalones',
    shoes: 'Zapatos',
    accessories: 'Accesorios',
    outerwear: 'Abrigos',
    emptyWardrobe: 'Tu guardarropa está vacío',
    startAdding: '¡Comienza agregando ropa para obtener recomendaciones de outfits!',
    
    // Upload Screen
    addNewClothing: 'Agregar Nueva Prenda',
    takePhoto: 'Tomar Foto',
    chooseFromGallery: 'Elegir de Galería',
    analyzing: 'Analizando tu prenda...',
    clothingDetails: 'Detalles de la Prenda',
    type: 'Tipo',
    color: 'Color',
    style: 'Estilo',
    season: 'Temporada',
    saveToWardrobe: 'Guardar en Guardarropa',
    clothingItemAdded: '¡Prenda agregada a tu guardarropa!',
    failedToSave: 'Error al guardar la prenda. Inténtalo de nuevo.',
    
    // Edit Clothing
    editClothingDetails: 'Editar Detalles de la Prenda',
    category: 'Categoría',
    enterClothingType: 'Ingresa el tipo de prenda (ej: camiseta, jeans)',
    enterDescription: 'Ingresa una descripción de este artículo',
    description: 'Descripción',
    selectCategory: 'Seleccionar Categoría',
    selectColor: 'Seleccionar Color',
    selectStyle: 'Seleccionar Estilo',
    selectSeason: 'Seleccionar Temporada',
    
    // Upgrade System
    upgradeRequired: 'Actualización Requerida',
    youHaveReached: 'Has alcanzado',
    items: 'artículos',
    upTo: 'Hasta',
    unlimitedOutfits: 'Recomendaciones ilimitadas de outfits',
    advancedAI: 'Estilismo avanzado con IA',
    prioritySupport: 'Soporte prioritario al cliente',
    everythingInPro: 'Todo lo de Pro',
    personalStylist: 'Estilista personal con IA',
    exclusiveFeatures: 'Características premium exclusivas',
    upgrade: 'Actualizar',
    upgradeToProMessage: 'Actualiza a Pro por $10 para agregar hasta 100 prendas',
    upgradeToPremiumMessage: 'Actualiza a Premium por $20 para agregar hasta 500 prendas',
    upgradeSuccessful: '¡Actualización exitosa! Ahora puedes agregar más artículos.',
    viewWardrobe: 'Ver Guardarropa',
    addMore: 'Agregar Más',
    success: 'Éxito',
    
    // Outfits Screen
    outfitRecommendations: 'Recomendaciones de Outfits',
    getRecommendations: 'Obtener Recomendaciones',
    styleQuiz: 'Quiz de Estilo',
    question1: '¿Cuál es la ocasión?',
    question2: '¿Cómo está el clima?',
    question3: '¿Cuál es tu vibra hoy?',
    
    // Occasions
    casual: 'Casual',
    work: 'Trabajo',
    party: 'Fiesta',
    date: 'Cita',
    gym: 'Gimnasio',
    
    // Weather
    sunny: 'Soleado',
    rainy: 'Lluvioso',
    cold: 'Frío',
    hot: 'Caluroso',
    mild: 'Templado',
    
    // Vibes
    comfortable: 'Cómodo',
    elegant: 'Elegante',
    trendy: 'Moderno',
    bold: 'Atrevido',
    minimalist: 'Minimalista',
    
    // Outfit Results
    recommendedOutfits: 'Outfits Recomendados',
    completeOutfit: 'Outfit Completo',
    missingItems: 'Artículos Faltantes',
    youNeed: 'Necesitas:',
    characteristics: 'Características:',
    
    // Profile Screen
    myProfile: 'Mi Perfil',
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',
    wardrobeStats: 'Estadísticas del Guardarropa',
    totalItems: 'Artículos Totales',
    outfitsCreated: 'Outfits Creados',
    
    // Common
    next: 'Siguiente',
    back: 'Atrás',
    done: 'Listo',
    cancel: 'Cancelar',
    save: 'Guardar',
    loading: 'Cargando...',
    error: 'Error',
    tryAgain: 'Intentar de Nuevo',
  },
};

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
        setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem('language', newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || key;
  };

  return {
    language,
    changeLanguage,
    t,
    isLoading,
  };
};