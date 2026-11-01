"use server";

import { checkUser } from "@/lib/checkUser";
import { getSupabaseAdmin } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { freePantryScans, proTierLimit } from "@/lib/arcjet";
import { request } from "@arcjet/next";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// camelCase aliases keep the UI components on their existing field names
const ITEM_FIELDS = `
  id,
  documentId:id,
  name,
  quantity,
  imageUrl:image_url,
  createdAt:created_at
`;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Scan image with Gemini Vision
export async function scanPantryImage(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Check if user is Pro
    const isPro = user.subscriptionTier === "pro";

    // Apply Arcjet rate limit based on tier
    const arcjetClient = isPro ? proTierLimit : freePantryScans;

    // Create a request object for Arcjet
    const req = await request();

    const decision = await arcjetClient.protect(req, {
      userId: user.clerkId, // Use clerkId from checkUser
      requested: 1, // Request 1 token from bucket
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new Error(
          `Monthly scan limit reached. ${
            isPro
              ? "Please contact support if you need more scans."
              : "Upgrade to Pro for unlimited scans!"
          }`
        );
      }
      throw new Error("Request denied by security system");
    }

    const imageFile = formData.get("image");
    if (!imageFile) {
      throw new Error("No image provided");
    }

    // Convert image to base64
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString("base64");

    // Call Gemini Vision API
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `
You are a professional chef and ingredient recognition expert. Analyze this image of a pantry/fridge and identify all visible food ingredients.

Return ONLY a valid JSON array with this exact structure (no markdown, no explanations):
[
  {
    "name": "ingredient name",
    "quantity": "estimated quantity with unit",
    "confidence": 0.95
  }
]

Rules:
- Only identify food ingredients (not containers, utensils, or packaging)
- Be specific (e.g., "Cheddar Cheese" not just "Cheese")
- Estimate realistic quantities (e.g., "3 eggs", "1 cup milk", "2 tomatoes")
- Confidence should be 0.7-1.0 (omit items below 0.7)
- Maximum 20 items
- Common pantry staples are acceptable (salt, pepper, oil)
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: imageFile.type,
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let ingredients;
    try {
      const cleanText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      ingredients = JSON.parse(cleanText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", text);
      throw new Error("Failed to parse ingredients. Please try again.");
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      throw new Error(
        "No ingredients detected in the image. Please try a clearer photo."
      );
    }

    return {
      success: true,
      ingredients: ingredients.slice(0, 20),
      scansLimit: isPro ? "unlimited" : 10,
      message: `Found ${ingredients.length} ingredients!`,
    };
  } catch (error) {
    console.error("Error scanning pantry:", error);
    throw new Error(error.message || "Failed to scan image");
  }
}

// Save ingredients to pantry
export async function saveToPantry(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const ingredientsJson = formData.get("ingredients");
    const ingredients = JSON.parse(ingredientsJson);

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients to save");
    }

    // Insert all scanned items in one round trip
    const supabase = getSupabaseAdmin();
    const { data: savedItems, error } = await supabase
      .from("pantry_items")
      .insert(
        ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity,
          image_url: "",
          owner_clerk_id: user.id,
        }))
      )
      .select(ITEM_FIELDS);

    if (error) {
      console.error("Error saving pantry items:", error.message);
      throw new Error("Failed to save items");
    }

    return {
      success: true,
      savedItems,
      message: `Saved ${savedItems.length} items to your pantry!`,
    };
  } catch (error) {
    console.error("Error saving to pantry:", error);
    throw new Error(error.message || "Failed to save items");
  }
}

// Add pantry item manually
export async function addPantryItemManually(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const name = formData.get("name");
    const quantity = formData.get("quantity");

    if (!name || !quantity) {
      throw new Error("Name and quantity are required");
    }

    const supabase = getSupabaseAdmin();
    const { data: item, error } = await supabase
      .from("pantry_items")
      .insert({
        name: name.trim(),
        quantity: quantity.trim(),
        image_url: "",
        owner_clerk_id: user.id,
      })
      .select(ITEM_FIELDS)
      .single();

    if (error) {
      console.error("Failed to add item:", error.message);
      throw new Error("Failed to add item to pantry");
    }

    return {
      success: true,
      item,
      message: "Item added successfully!",
    };
  } catch (error) {
    console.error("Error adding item manually:", error);
    throw new Error(error.message || "Failed to add item");
  }
}

// Get user's pantry items
export async function getPantryItems() {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const supabase = getSupabaseAdmin();
    const { data: items, error } = await supabase
      .from("pantry_items")
      .select(ITEM_FIELDS)
      .eq("owner_clerk_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to fetch pantry items");
    }

    const isPro = user.subscriptionTier === "pro";

    return {
      success: true,
      items: items || [],
      scansLimit: isPro ? "unlimited" : 10,
    };
  } catch (error) {
    console.error("Error fetching pantry:", error);
    throw new Error(error.message || "Failed to load pantry");
  }
}

// Delete pantry item
export async function deletePantryItem(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const itemId = formData.get("itemId");

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("pantry_items")
      .delete()
      .eq("id", itemId)
      .eq("owner_clerk_id", user.id);

    if (error) {
      throw new Error("Failed to delete item");
    }

    return {
      success: true,
      message: "Item removed from pantry",
    };
  } catch (error) {
    console.error("Error deleting item:", error);
    throw new Error(error.message || "Failed to delete item");
  }
}

// Update pantry item
export async function updatePantryItem(formData) {
  try {
    const user = await checkUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const itemId = formData.get("itemId");
    const name = formData.get("name");
    const quantity = formData.get("quantity");

    const supabase = getSupabaseAdmin();
    const { data: item, error } = await supabase
      .from("pantry_items")
      .update({ name, quantity })
      .eq("id", itemId)
      .eq("owner_clerk_id", user.id)
      .select(ITEM_FIELDS)
      .single();

    if (error) {
      throw new Error("Failed to update item");
    }

    return {
      success: true,
      item,
      message: "Item updated successfully",
    };
  } catch (error) {
    console.error("Error updating item:", error);
    throw new Error(error.message || "Failed to update item");
  }
}
