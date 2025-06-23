#!/usr/bin/env python3
"""
手动测试推送脚本
"""

import sys
import os
from datetime import datetime, date
from pathlib import Path

# 添加agent路径
sys.path.append('.')

from paperpulse.main import PaperPulseAgent
from paperpulse.supabase_client import SupabaseClient
from paperpulse.arxiv_client import ArxivClient
from dotenv import load_dotenv

def manual_push_test():
    """手动测试推送"""
    load_dotenv('.env')
    
    print("🚀 手动测试推送流程")
    print("=" * 50)
    
    try:
        # 1. 测试更广泛的关键词搜索
        print("\n🔍 1. 测试关键词搜索...")
        client = ArxivClient()
        
        # 使用更广泛的关键词
        test_keywords = ['transformer', 'attention', 'neural', 'AI']
        all_papers = []
        
        for keyword in test_keywords:
            papers = client.search_papers(keyword, days_back=7)  # 扩展到7天
            print(f"   {keyword}: {len(papers)} 篇论文")
            all_papers.extend(papers)
        
        # 去重
        unique_papers = []
        seen_ids = set()
        for paper in all_papers:
            if paper['id'] not in seen_ids:
                seen_ids.add(paper['id'])
                unique_papers.append(paper)
        
        print(f"   📚 总共找到 {len(unique_papers)} 篇唯一论文")
        
        if len(unique_papers) > 0:
            print("\n📄 前3篇论文:")
            for i, paper in enumerate(unique_papers[:3]):
                print(f"   {i+1}. {paper['title']}")
                print(f"      发布: {paper['published']}")
        
        # 2. 生成完整的digest文件
        print(f"\n💾 2. 生成digest文件...")
        agent = PaperPulseAgent()
        
        # 取前20篇论文
        papers_to_save = unique_papers[:20]
        success = agent.save_daily_digest(papers_to_save)
        
        print(f"   📝 保存结果: {'成功' if success else '失败'}")
        print(f"   📄 保存论文数: {len(papers_to_save)}")
        
        # 3. 检查生成的文件
        digest_file = Path("../web/public/static/digests") / f"{date.today().isoformat()}.json"
        if digest_file.exists():
            print(f"   📁 文件路径: {digest_file}")
            print(f"   📏 文件大小: {digest_file.stat().st_size} 字节")
            
            # 验证JSON格式
            import json
            try:
                with open(digest_file, 'r') as f:
                    data = json.load(f)
                print(f"   ✅ JSON格式正确，包含 {len(data.get('papers', []))} 篇论文")
            except Exception as e:
                print(f"   ❌ JSON格式错误: {e}")
        
        # 4. 测试订阅者处理
        print(f"\n👥 3. 测试订阅者处理...")
        subscribers = agent.load_subscribers()
        print(f"   📧 找到 {len(subscribers)} 位订阅者")
        
        for subscriber in subscribers:
            print(f"   处理: {subscriber.email}")
            print(f"   关键词: {subscriber.keywords}")
            
            # 过滤相关论文
            relevant_papers = []
            for paper in papers_to_save:
                for keyword in subscriber.keywords:
                    if keyword.lower() in paper['title'].lower() or keyword.lower() in paper['abstract'].lower():
                        relevant_papers.append(paper)
                        break
            
            print(f"   相关论文: {len(relevant_papers)}")
            
            if len(relevant_papers) > 0:
                print(f"   📧 模拟发送邮件给 {subscriber.email}")
                print(f"   📄 包含 {len(relevant_papers)} 篇相关论文")
            else:
                print(f"   ⚠️  没有找到相关论文")
        
        print(f"\n✅ 手动测试完成!")
        
    except Exception as e:
        print(f"\n❌ 测试过程中出错: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    manual_push_test() 