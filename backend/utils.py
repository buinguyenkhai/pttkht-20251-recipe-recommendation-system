import re
def preprocess_vietnamese(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)

    stopwords = {
       "và", "là", "của", "có", "cho", "trên", "với", "ở", "những", "các", "một", "được", "này"
    }

    tokens = text.split()
    filtered = [t for t in tokens if t not in stopwords]
    return ' '.join(filtered)

quantity_to_gram = {
    "bát": 150,           # bát cơm/nước ~ 250g
    "chén": 100,          # chén nhỏ hơn bát
    "chút": 5,            # rất ít
    "con": 100,           # ví dụ con cá, con gà nhỏ
    "cây": 30,            # hành/cần tây...
    "củ": 50,             # ví dụ: củ hành, củ tỏi...
    "gói": 100,           # gói mì, bột
    "hũ": 200,            # hũ sữa chua, hũ mắm
    "hộp": 250,           # hộp thiếc/hộp nhựa
    "khay": 300,          # khay thịt
    "lá": 1,              # 1 lá ~ 1g
    "lòng đỏ": 17,        # 1 lòng đỏ trứng gà ~ 17g
    "lòng trắng": 33,     # 1 lòng trắng trứng gà ~ 33g
    "muỗng canh": 15,     # tablespoon
    "muỗng cà phê": 5,    # teaspoon
    "muỗng": 10,          # trung bình
    "mớ": 100,            # mớ rau
    "nhánh": 5,           # nhánh tỏi
    "nhúm": 2,            # nhúm muối
    "que": 20,            # xiên, hoặc tương đương
    "quả": 50,           # ví dụ quả trứng, quả cà chua
    "thìa canh": 15,      # = muỗng canh
    "thìa cà phê": 5,
    "thìa nhỏ": 10,
    "thìa": 10,
    "trái": 50,
    "vài viên": 30,       # 3 viên x 10g/viên
    "xíu": 1,
    "ít": 2,
    "l": 1000,            # lít nước = 1000g
    "cái": 50,            # cái bánh, cái trứng,...
    "g": 1,
    "gam": 1,
    "kg": 1000,
    "ml": 1,              # giả sử là nước (1ml = 1g)
    "bông": 20,           # bông cải
    "gr": 1,
    "gram": 1,
    "bộ khung": 500,     # ví dụ bộ xương gà
    "lít": 1000,
    "miếng": 50,          # miếng thịt
    "viên": 10,
    "bó": 100,            # bó rau
    "lát": 20,
    "mẩu": 10,
    "tép": 5,             # tép tỏi
    "bộ": 300,            # bộ lòng, bộ phận
    "bịch": 200,          # bịch đường, bột
    "chiếc": 100,
    "cục nhỏ": 20,
    "khúc": 100,
    "lon": 200,           # lon sữa đặc
    "nắm": 50,
    "phần": 200,          # phần ăn
    "thìa cafe": 5,
    "tô": 350,             # tô canh, tô mì
    "ống": 50           # ống hút, ống trúc
}