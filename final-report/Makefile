
all: final.html

final.html: final.md
	pandoc --toc -o final.html --template toc-sidebar.html --css=icg_report.css --mathml -s final.md 
