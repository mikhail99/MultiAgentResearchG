#!/usr/bin/env python3
"""
Test script for FastAPI backend
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"

def test_health_endpoint() -> bool:
    """Test the health endpoint"""
    print("🏥 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data['status']}")
            print(f"📊 Services: {data['services']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_search_stats() -> bool:
    """Test the search stats endpoint"""
    print("\n📊 Testing search stats endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/search/stats")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Search stats: {data['stats']}")
            return True
        else:
            print(f"❌ Search stats failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Search stats error: {e}")
        return False

def test_search_functionality() -> bool:
    """Test the search functionality"""
    print("\n🔍 Testing search functionality...")
    try:
        response = requests.post(
            f"{BASE_URL}/search/test",
            params={"query": "reasoning agents", "n_results": 2}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Search test successful")
            print(f"📄 Found {data['total_found']} results")
            print(f"🔍 Query: {data['query']}")
            return True
        else:
            print(f"❌ Search test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Search test error: {e}")
        return False

def test_tool_endpoint() -> bool:
    """Test the tool endpoint with local search"""
    print("\n🔧 Testing tool endpoint...")
    
    tool_request = {
        "agent_name": "Researcher",
        "task": "local_search",
        "query": "multi-agent systems",
        "metadata": {
            "iteration": 1,
            "modelProvider": "GEMINI"
        },
        "id": "test_request_123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/tool",
            json=tool_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            if data['success']:
                print("✅ Tool endpoint test successful")
                print(f"📝 Result length: {len(data['result'])} characters")
                print(f"🔍 Query: {data['metadata']['query']}")
                return True
            else:
                print(f"❌ Tool execution failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Tool endpoint failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Tool endpoint error: {e}")
        return False

def test_web_search_placeholder() -> bool:
    """Test the web search placeholder"""
    print("\n🌐 Testing web search placeholder...")
    
    tool_request = {
        "agent_name": "Researcher",
        "task": "web_search",
        "query": "latest AI research",
        "metadata": {},
        "id": "test_web_123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/tool",
            json=tool_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Web search placeholder: {data['success']}")
            print(f"📝 Message: {data['result'][:100]}...")
            return True
        else:
            print(f"❌ Web search test failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Web search test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 FastAPI Backend Test Suite")
    print("=" * 50)
    
    # Wait a moment for server to be ready
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    tests = [
        ("Health Check", test_health_endpoint),
        ("Search Stats", test_search_stats),
        ("Search Functionality", test_search_functionality),
        ("Tool Endpoint", test_tool_endpoint),
        ("Web Search Placeholder", test_web_search_placeholder),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} failed")
    
    print(f"\n{'='*50}")
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the server logs for details.")
    
    print(f"\n📖 API Documentation available at: {BASE_URL}/docs")

if __name__ == "__main__":
    main()
