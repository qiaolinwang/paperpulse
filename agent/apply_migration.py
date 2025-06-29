#!/usr/bin/env python3
"""
Apply database migration to fix missing paper_ids column
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def apply_migration():
    """Apply the migration to add paper_ids column"""
    # Initialize Supabase client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        print("❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return
    
    client = create_client(url, key)
    
    # Migration SQL
    migration_sql = """
    -- Add missing paper_ids column to digest_history table
    DO $$
    BEGIN
        -- Add paper_ids column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digest_history' AND column_name = 'paper_ids') THEN
            ALTER TABLE digest_history ADD COLUMN paper_ids JSONB DEFAULT '[]'::jsonb;
            RAISE NOTICE 'Added paper_ids column to digest_history table';
        ELSE
            RAISE NOTICE 'paper_ids column already exists in digest_history table';
        END IF;
    END $$;
    
    -- Create an index on paper_ids for better query performance
    CREATE INDEX IF NOT EXISTS idx_digest_history_paper_ids ON digest_history USING GIN (paper_ids);
    """
    
    try:
        print("🔧 Applying migration to add paper_ids column...")
        
        # Execute the migration
        response = client.rpc('exec_sql', {'sql': migration_sql}).execute()
        
        print("✅ Migration applied successfully!")
        
        # Verify the column was added
        verify_sql = """
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'digest_history' 
        ORDER BY ordinal_position;
        """
        
        print("\n📋 Current digest_history table schema:")
        schema_response = client.rpc('exec_sql', {'sql': verify_sql}).execute()
        
        if schema_response.data:
            for row in schema_response.data:
                print(f"   - {row['column_name']}: {row['data_type']} ({'nullable' if row['is_nullable'] == 'YES' else 'not null'})")
        
    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        print("\n🔄 Trying alternative approach...")
        
        # Alternative: Use raw SQL execution if RPC doesn't work
        try:
            # Try to add column directly
            response = client.table('digest_history').select('*').limit(1).execute()
            print("✅ Database connection successful")
            
            print("⚠️  Manual migration required. Please run this SQL in your Supabase dashboard:")
            print("\n" + "="*50)
            print(migration_sql)
            print("="*50)
            
        except Exception as e2:
            print(f"❌ Database connection failed: {e2}")

if __name__ == "__main__":
    apply_migration() 