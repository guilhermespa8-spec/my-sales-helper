import fdb
import os

DLL_PATH = r'C:\GDOOR Sistemas\GDOOR PRO\Conversao Firebird\Firebird_5_0\fbclient.dll'
DB_PATH = r'C:\GDOOR Sistemas\GDOOR PRO\DATAGES.FDB'

if os.path.exists(DLL_PATH):
    fdb.load_api(DLL_PATH)

try:
    con = fdb.connect(dsn=DB_PATH, user='SYSDBA', password='masterkey', charset='WIN1252')
    cur = con.cursor()
    
    print("\n--- COLUNAS DA TABELA ESTOQUE ---")
    cur.execute("SELECT RDB$FIELD_NAME FROM RDB$RELATION_FIELDS WHERE RDB$RELATION_NAME = 'ESTOQUE'")
    cols = cur.fetchall()
    for c in cols:
        print(c[0].strip())
    
    con.close()
except Exception as e:
    print(f"Erro: {e}")
