#!/bin/bash

#set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [-t TAG] [-f FILE_PATTERN] [-d DIR]"
    echo ""
    echo "Options:"
    echo ""
    echo "Examples:"
    echo ""
    exit 1
}

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Parse command line arguments
OWNER="lightningrodlabs"
REPO="vines"
TAG="latest"
FILE_PATTERN="*.happ"
DOWNLOAD_DIR="./artifacts"

# Check if required commands are available
for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
        print_error "$cmd is required but not installed. Please install it first."
        exit 1
    fi
done

# Create download directory if it doesn't exist
mkdir -p "$DOWNLOAD_DIR"

# Construct API URL
if [ "$TAG" = "latest" ]; then
    API_URL="https://api.github.com/repos/$OWNER/$REPO/releases/latest"
    print_info "Fetching latest release for $OWNER/$REPO..."
else
    API_URL="https://api.github.com/repos/$OWNER/$REPO/releases/tags/$TAG"
    print_info "Fetching release $TAG for $OWNER/$REPO..."
fi

# Fetch release information
RESPONSE=$(curl -sS -H "Accept: application/vnd.github+json" "$API_URL")

# Check if the request was successful
if echo "$RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.message')
    print_error "Failed to fetch release: $ERROR_MSG"
    exit 1
fi

# Get release tag name
RELEASE_TAG=$(echo "$RESPONSE" | jq -r '.tag_name')
print_info "Found release: $RELEASE_TAG"

# Get download URLs for assets
ASSETS=$(echo "$RESPONSE" | jq -r '.assets[] | "\(.name)|\(.browser_download_url)"')

if [ -z "$ASSETS" ]; then
    print_warning "No assets found in this release"
    exit 0
fi

# Download matching files
DOWNLOADED=0
while IFS='|' read -r filename url; do
    # Check if filename matches pattern
    if [[ "$filename" == $FILE_PATTERN ]]; then
        print_info "Downloading: $filename"

        # Download file
        if curl -L -o "$DOWNLOAD_DIR/$filename" "$url" --progress-bar; then
            print_info "Successfully downloaded: $filename"
            ((DOWNLOADED++))
        else
            print_error "Failed to download: $filename"
        fi
    fi
done <<< "$ASSETS"

# Summary
echo ""
if [ $DOWNLOADED -eq 0 ]; then
    print_warning "No files matching pattern '$FILE_PATTERN' were downloaded"
else
    print_info "Download complete! Downloaded $DOWNLOADED file(s) to $DOWNLOAD_DIR"
fi