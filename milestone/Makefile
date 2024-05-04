
all: milestone.html

milestone.html: milestone.md
	pandoc --toc -o milestone.html --template toc-sidebar.html --css=icg_report.css -s milestone.md
