#!/usr/bin/env python3
"""
Test script for the Research Agents backend
"""

import requests
import json

def test_backend():
    """Test all endpoints of the Research Agents backend"""
    base_url = "http://localhost:8001"
    
    print("🧪 Testing Research Agents Backend")
    print("=" * 50)
    
    # Test root endpoint
    print("1. Testing root endpoint...")
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("   ✅ Root endpoint works")
        else:
            print(f"   ❌ Root endpoint failed with status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Root endpoint error: {e}")
    
    # Test health endpoint
    print("2. Testing health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Health endpoint works - Status: {data['status']}")
            print(f"      Services: {data['services']}")
        else:
            print(f"   ❌ Health endpoint failed with status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Health endpoint error: {e}")
    
    # Test arxiv search endpoint
    print("3. Testing arxiv search endpoint...")
    try:
        response = requests.get(f"{base_url}/arxiv/search?query=neural+networks&max_results=2")
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print(f"   ✅ arxiv search works - Found {data['total_found']} papers")
                for i, paper in enumerate(data["results"], 1):
                    print(f"      {i}. {paper['title'][:50]}...")
            else:
                print(f"   ❌ arxiv search failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ arxiv search failed with status {response.status_code}")
    except Exception as e:
        print(f"   ❌ arxiv search error: {e}")
    
    # Test tool endpoint
    print("4. Testing tool endpoint...")
    try:
        payload = {
            "agent_name": "TestAgent",
            "task": "arxiv_search",
            "query": "machine learning"
        }
        response = requests.post(f"{base_url}/tool", json=payload)
        if response.status_code == 200:
            data = response.json()
            if data["success"]:
                print("   ✅ Tool endpoint works")
                print(f"      Result preview: {data['result'][:100]}...")
            else:
                print(f"   ❌ Tool endpoint failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"   ❌ Tool endpoint failed with status {response.status_code}")
    except Exception as e:
        print(f"   ❌ Tool endpoint error: {e}")
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    test_backend()