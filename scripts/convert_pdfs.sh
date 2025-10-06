#!/bin/bash

# Script to convert first 10 PDFs to Markdown using MinerU
# Usage: ./convert_pdfs.sh

# Set paths
PDF_DIR="backend/data/collections/LLM_Reasoning_Agents/pdfs"
OUTPUT_DIR="backend/data/collections/LLM_Reasoning_Agents/markdown"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Counter for tracking progress
count=0
max_files=10

echo "🚀 Starting PDF to Markdown conversion..."
echo "📁 Input directory: $PDF_DIR"
echo "📁 Output directory: $OUTPUT_DIR"
echo "📊 Converting first $max_files PDFs..."
echo ""

# Loop through PDF files and convert first 10
for pdf_file in "$PDF_DIR"/*.pdf; do
    if [ $count -ge $max_files ]; then
        break
    fi
    
    if [ -f "$pdf_file" ]; then
        # Extract filename without path and extension
        filename=$(basename "$pdf_file" .pdf)
        
        # Define output file path
        output_file="$OUTPUT_DIR/${filename}.md"
        
        echo "🔄 Converting: $filename.pdf ($((count + 1))/$max_files)"
        
        # Run MinerU conversion
        if mineru -p "$pdf_file" -o "$output_file" -d cpu; then
            echo "✅ Success: $filename.md"
        else
            echo "❌ Failed: $filename.pdf"
        fi
        
        echo ""
        ((count++))
    fi
done

echo "🎉 Conversion complete!"
echo "📊 Processed $count PDF files"
echo "📁 Check results in: $OUTPUT_DIR"
